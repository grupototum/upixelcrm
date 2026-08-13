import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Repositório do domínio Alexandria/RAG (rag_documents, rag_embeddings,
// rag_context) + edge ai-chat. Funções puras de acesso a dados; toast/estado
// ficam nos componentes (KnowledgeBaseTab, RagDocuments/BibliotecaPage,
// AnalyticsPanel, RAGIntegrationStatus, AssistantTab).

export type RagDocumentRow = Tables<"rag_documents">;

// ---- rag_documents ----

export async function listRagDocumentsForClient(
  clientId: string
): Promise<Pick<RagDocumentRow, "id" | "title" | "content" | "type" | "created_at" | "is_global">[]> {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id, title, content, type, created_at, is_global")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/** Sem filtro de client_id — usado na Biblioteca (visão global/master). */
export async function listAllRagDocuments(): Promise<
  Pick<RagDocumentRow, "id" | "title" | "content" | "type" | "partition" | "created_at" | "is_global">[]
> {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id, title, content, type, partition, created_at, is_global")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function insertRagDocument(row: TablesInsert<"rag_documents">): Promise<void> {
  const { error } = await supabase.from("rag_documents").insert(row);
  if (error) throw error;
}

export async function deleteRagDocument(id: string): Promise<void> {
  const { error } = await supabase.from("rag_documents").delete().eq("id", id);
  if (error) throw error;
}

// ---- analytics (AnalyticsPanel) ----

export interface RagAnalyticsRaw {
  docs: Pick<RagDocumentRow, "id" | "type">[];
  ctxCount: number;
  scores: number[];
}

/**
 * Réplica exata das 3 queries originais do AnalyticsPanel: docsRes e ctxRes
 * têm o erro checado; ctxAvgRes não (comportamento herdado, preservado aqui).
 */
export async function getRagAnalyticsRaw(): Promise<RagAnalyticsRaw> {
  const [docsRes, ctxRes, ctxAvgRes] = await Promise.all([
    supabase.from("rag_documents").select("id, type"),
    // count no servidor em vez de baixar todas as linhas só pra contar
    supabase.from("rag_context").select("id", { count: "exact", head: true }),
    supabase.from("rag_context").select("similarity_score"),
  ]);

  if (docsRes.error) throw docsRes.error;
  if (ctxRes.error) throw ctxRes.error;

  const docs = docsRes.data || [];
  const ctxCount = ctxRes.count ?? 0;
  const scores = (ctxAvgRes.data || []).map((r) => r.similarity_score);

  return { docs, ctxCount, scores };
}

// ---- health check (RAGIntegrationStatus) ----

export async function probeRagDocumentsTable(): Promise<{ ok: boolean; hasData: boolean }> {
  const { data, error } = await supabase.from("rag_documents").select("id").limit(1);
  return { ok: !error, hasData: !!data && data.length > 0 };
}

export async function probeRagEmbeddingsTable(): Promise<{ ok: boolean; hasData: boolean }> {
  const { data, error } = await supabase.from("rag_embeddings").select("id").limit(1);
  return { ok: !error, hasData: !!data && data.length > 0 };
}

export async function probeRagContextTable(): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("rag_context").select("id").limit(1);
  return { ok: !error };
}

// ---- media storage (upload de PDF/DOCX na base de conhecimento) ----

export async function uploadRagMediaFile(
  filePath: string,
  file: File
): Promise<{ publicUrl: string }> {
  const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file);
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);
  return { publicUrl: urlData.publicUrl };
}

// ---- edge ai-chat ----
// Mesmo padrão de triggerAutomationEngine: supabase.functions.invoke direto,
// sem refresh de sessão (comportamento original do AssistantTab).

export function invokeAiChat(history: { role: string; content: string }[]): Promise<{ data: any; error: any }> {
  return supabase.functions.invoke("ai-chat", { body: { messages: history } }) as Promise<{ data: any; error: any }>;
}

// ---- edge rag-embed / rag-search ----

export async function generateDocumentEmbeddings(documentId: string): Promise<{ success: boolean; chunks: number }> {
  const { data, error } = await supabase.functions.invoke("rag-embed", {
    body: { document_id: documentId },
  });
  if (error) throw new Error(error.message || "Failed to generate embeddings");
  if (data?.error) throw new Error(data.error);
  return { success: true, chunks: data?.chunks || 0 };
}

export interface RagSearchResult {
  documentId: string;
  title: string;
  content: string;
  similarity: number;
  type: string;
}

export async function searchSimilarDocuments(
  query: string,
  limit = 5,
  threshold = 0.3
): Promise<RagSearchResult[]> {
  const { data, error } = await supabase.functions.invoke("rag-search", {
    body: { query, limit, threshold },
  });
  if (error) throw new Error(error.message || "Search failed");
  if (data?.error) throw new Error(data.error);
  return data?.results || [];
}
