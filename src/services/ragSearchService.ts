import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
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
): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke("rag-search", {
    body: { query, limit, threshold },
  });

  if (error) throw new Error(error.message || "Search failed");
  if (data?.error) throw new Error(data.error);
  return data?.results || [];
}

export function injectContextIntoPrompt(query: string, results: SearchResult[]): string {
  if (!results.length) return query;

  const context = results
    .map((r, i) => `[${i + 1}] ${r.title} (${(r.similarity * 100).toFixed(0)}% relevante):\n${r.content}`)
    .join("\n\n");

  return `Contexto relevante da base de conhecimento:\n---\n${context}\n---\n\nPergunta: ${query}`;
}
