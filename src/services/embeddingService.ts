import { supabase } from "@/integrations/supabase/client";

export async function generateDocumentEmbeddings(documentId: string): Promise<{ success: boolean; chunks: number }> {
  const { data, error } = await supabase.functions.invoke("rag-embed", {
    body: { document_id: documentId },
  });

  if (error) throw new Error(error.message || "Failed to generate embeddings");
  if (data?.error) throw new Error(data.error);
  return { success: true, chunks: data?.chunks || 0 };
}
