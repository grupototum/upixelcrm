import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function chunkText(text: string, maxLen = 500): string[] {
  if (!text || text.length <= maxLen) return [text || ""];
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + " " + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  // Use Lovable AI gateway to generate a pseudo-embedding via tool calling
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
          content: `You are an embedding generator. Given text, produce a semantic embedding as a JSON array of exactly 384 floating-point numbers between -1 and 1. The embedding should capture the semantic meaning of the text. Different texts with similar meanings should produce similar vectors. Output ONLY the JSON array, nothing else.`,
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
                  description: "Array of exactly 384 floating-point numbers between -1 and 1 representing the semantic embedding",
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

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("AI gateway error:", resp.status, errText);
    throw new Error(`AI gateway error: ${resp.status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  const args = JSON.parse(toolCall.function.arguments);
  let embedding = args.embedding;

  if (!Array.isArray(embedding)) throw new Error("Invalid embedding format");

  // Ensure exactly 384 dimensions
  if (embedding.length > 384) embedding = embedding.slice(0, 384);
  while (embedding.length < 384) embedding.push(0);

  // Normalize
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

    // Verify user
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

    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Get document
    const { data: doc, error: docErr } = await adminClient
      .from("rag_documents")
      .select("id, title, content, client_id, is_global")
      .eq("id", document_id)
      .single();

    if (docErr || !doc) throw new Error("Document not found");

    // Get user's client_id for security check
    const { data: profile } = await adminClient
      .from("profiles")
      .select("client_id, role")
      .eq("id", user.id)
      .single();

    // Master can embed any doc; others must match client_id
    // Global docs can only be embedded by master
    const isGlobalDoc = (doc as any).is_global === true;
    if (isGlobalDoc && profile.role !== "master") {
      return new Response(JSON.stringify({ error: "Only master can embed global documents" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isGlobalDoc && profile.client_id !== doc.client_id && profile.role !== "master") {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete old embeddings for this document
    await adminClient.from("rag_embeddings").delete().eq("document_id", document_id);

    // Chunk and embed
    const fullText = `${doc.title}\n\n${doc.content}`;
    const chunks = chunkText(fullText);
    const results = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i], lovableKey);
      const isGlobal = (doc as any).is_global === true;
      const { error: insertErr } = await adminClient.from("rag_embeddings").insert({
        document_id: doc.id,
        client_id: doc.client_id,
        chunk_index: i,
        chunk_text: chunks[i],
        embedding: `[${embedding.join(",")}]`,
        is_global: isGlobal,
      });
      if (insertErr) console.error("Insert error:", insertErr);
      else results.push({ chunk_index: i, length: chunks[i].length });
    }

    return new Response(JSON.stringify({ success: true, chunks: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rag-embed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
