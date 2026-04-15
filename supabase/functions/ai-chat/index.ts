import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You are an embedding generator. Given text, produce a semantic embedding as a JSON array of exactly 384 floating-point numbers between -1 and 1. Output ONLY the JSON array." },
        { role: "user", content: text.slice(0, 2000) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_embedding",
          description: "Store the generated embedding vector",
          parameters: {
            type: "object",
            properties: { embedding: { type: "array", items: { type: "number" } } },
            required: ["embedding"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "store_embedding" } },
    }),
  });
  if (!resp.ok) throw new Error(`Embedding error: ${resp.status}`);
  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No embedding tool call");
  const args = JSON.parse(toolCall.function.arguments);
  let embedding = args.embedding;
  if (!Array.isArray(embedding)) throw new Error("Invalid embedding: not an array");
  // FIX-10: Reject empty embeddings before normalization. An empty array silently
  // becomes 384 zeros, whose norm is 0. The previous `|| 1` fallback produced a
  // zero-vector that is mathematically invalid for cosine similarity — it would return
  // equal (maximum or minimum) similarity against every stored document, poisoning RAG.
  if (embedding.length === 0) throw new Error("Invalid embedding: model returned empty array");
  if (embedding.length > 384) embedding = embedding.slice(0, 384);
  while (embedding.length < 384) embedding.push(0);
  const norm = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0));
  if (norm < 1e-9) throw new Error("Invalid embedding: zero-magnitude vector cannot be normalized for cosine similarity");
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

    const { messages, system_prompt } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages array is required");
    }

    const userMessage = messages[messages.length - 1]?.content || "";

    // Get user profile
    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("client_id, role, name")
      .eq("id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    // RAG Search
    let ragContext = "";
    let ragDocuments: any[] = [];
    try {
      const queryEmbedding = await generateQueryEmbedding(userMessage, lovableKey);
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      const { data: matches } = await adminClient.rpc("match_rag_documents", {
        query_embedding: embeddingStr,
        match_threshold: 0.3,
        match_count: 5,
        p_client_id: profile.role === "master" ? null : profile.client_id,
      });

      if (matches && matches.length > 0) {
        const docIds = [...new Set(matches.map((m: any) => m.document_id))];
        const { data: docs } = await adminClient
          .from("rag_documents")
          .select("id, title, type")
          .in("id", docIds);
        const docMap = Object.fromEntries((docs || []).map((d: any) => [d.id, d]));

        ragDocuments = matches.map((m: any) => ({
          id: m.document_id,
          title: docMap[m.document_id]?.title || "",
          type: docMap[m.document_id]?.type || "",
          content: m.chunk_text,
          similarity: m.similarity,
        }));

        ragContext = ragDocuments
          .map((d: any, i: number) => `[${i + 1}] (${d.type}) ${d.title}:\n${d.content}`)
          .join("\n\n");

        // Log RAG usage
        for (const r of ragDocuments.slice(0, 3)) {
          await adminClient.from("rag_context").insert({
            client_id: profile.client_id,
            document_id: r.id,
            query: userMessage,
            similarity_score: r.similarity,
          });
        }
      }
    } catch (ragErr) {
      console.warn("RAG search failed, continuing without context:", ragErr);
    }

    // Build system prompt with RAG context
    const baseSystemPrompt = system_prompt || `Você é o assistente uPixel, um assistente inteligente de CRM. Ajude o usuário ${profile.name || ""} com sugestões comerciais, orientações sobre o sistema e estratégias de vendas. Responda sempre em português brasileiro de forma clara e objetiva.`;

    const finalSystemPrompt = ragContext
      ? `${baseSystemPrompt}\n\nCONTEXTO RELEVANTE DA BASE DE CONHECIMENTO:\n---\n${ragContext}\n---\n\nUse o contexto acima para enriquecer suas respostas quando relevante. Cite as fontes quando possível.`
      : baseSystemPrompt;

    // Call AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: finalSystemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI error ${aiResp.status}: ${errText}`);
    }

    const aiData = await aiResp.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({
      message: assistantMessage,
      rag: {
        used: ragContext.length > 0,
        documents: ragDocuments.map((d: any) => ({ id: d.id, title: d.title, type: d.type, similarity: d.similarity })),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
