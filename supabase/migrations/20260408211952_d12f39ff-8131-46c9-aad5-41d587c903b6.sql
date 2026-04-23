
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing document chunk embeddings
CREATE TABLE public.rag_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  document_id UUID REFERENCES public.rag_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL DEFAULT '',
  embedding vector(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rag_embeddings in their client"
ON public.rag_embeddings FOR SELECT TO authenticated
USING (client_id = get_user_client_id() OR is_master_user());

CREATE POLICY "Users can insert rag_embeddings in their client"
ON public.rag_embeddings FOR INSERT TO authenticated
WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can update rag_embeddings in their client"
ON public.rag_embeddings FOR UPDATE TO authenticated
USING (client_id = get_user_client_id() OR is_master_user());

CREATE POLICY "Users can delete rag_embeddings in their client"
ON public.rag_embeddings FOR DELETE TO authenticated
USING (client_id = get_user_client_id() OR is_master_user());

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_rag_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  p_client_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    re.id,
    re.document_id,
    re.chunk_text,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM public.rag_embeddings re
  WHERE 1 - (re.embedding <=> query_embedding) > match_threshold
    AND (p_client_id IS NULL OR re.client_id = p_client_id)
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Index for vector search (needs at least some rows to build, so use IF NOT EXISTS pattern)
-- Using HNSW which doesn't require training data
CREATE INDEX idx_rag_embeddings_embedding ON public.rag_embeddings
USING hnsw (embedding vector_cosine_ops);

-- Updated_at trigger
CREATE TRIGGER update_rag_embeddings_updated_at
BEFORE UPDATE ON public.rag_embeddings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
