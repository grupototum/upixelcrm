import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Given text, produce a semantic embedding as a JSON array of exactly 384 floating-point numbers between -1 and 1. The embedding should capture the semantic meaning of the text. Output ONLY the JSON array, nothing else.`,
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "store_embedding",
            description: "Store the generated embedding vector",
            parameters: {
              type: "object",
              properties: {
                embedding: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of exactly 384 floating-point numbers between -1 and 1",
                },
              },
              required: ["embedding"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "store_embedding" } },
    }),
  });

  if (!resp.ok) throw new Error(`AI gateway error: ${resp.status}`);

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  const args = JSON.parse(toolCall.function.arguments);
  let embedding = args.embedding;
  if (!Array.isArray(embedding)) throw new Error("Invalid embedding format");

  if (embedding.length > 384) embedding = embedding.slice(0, 384);
  while (embedding.length < 384) embedding.push(0);

  const norm = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return embedding.map((v: number) => v / norm);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, limit = 5, threshold = 0.3 } = await req.json();
    if (!query) throw new Error("query is required");

    // Get user's client_id
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("client_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const queryEmbedding = await generateQueryEmbedding(query, lovableKey);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Pass client_id; match_rag_documents now includes is_global=true automatically
    const { data: matches, error: matchErr } = await adminClient.rpc("match_rag_documents", {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: limit,
      p_client_id: profile.role === "master" ? null : profile.client_id,
    });

    if (matchErr) throw matchErr;

    // Enrich with document info
    const docIds = [...new Set((matches || []).map((m: any) => m.document_id))];
    let docs: any[] = [];
    if (docIds.length) {
      const { data } = await adminClient
        .from("rag_documents")
        .select("id, title, type")
        .in("id", docIds);
      docs = data || [];
    }

    const docMap = Object.fromEntries(docs.map((d: any) => [d.id, d]));
    const results = (matches || []).map((m: any) => ({
      documentId: m.document_id,
      title: docMap[m.document_id]?.title || "",
      type: docMap[m.document_id]?.type || "",
      content: m.chunk_text,
      similarity: m.similarity,
    }));

    // Log context usage
    for (const r of results.slice(0, 3)) {
      await adminClient.from("rag_context").insert({
        client_id: profile.client_id,
        document_id: r.documentId,
        query,
        similarity_score: r.similarity,
      }).then(() => {});
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rag-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
