
-- Add is_global column to rag_documents
ALTER TABLE public.rag_documents ADD COLUMN is_global boolean NOT NULL DEFAULT false;

-- Add is_global column to rag_embeddings
ALTER TABLE public.rag_embeddings ADD COLUMN is_global boolean NOT NULL DEFAULT false;

-- Drop existing RLS policies on rag_documents
DROP POLICY IF EXISTS "Users can view rag_documents in their client" ON public.rag_documents;
DROP POLICY IF EXISTS "Users can insert rag_documents in their client" ON public.rag_documents;
DROP POLICY IF EXISTS "Users can update rag_documents in their client" ON public.rag_documents;
DROP POLICY IF EXISTS "Users can delete rag_documents in their client" ON public.rag_documents;

-- Recreate rag_documents policies with is_global support
CREATE POLICY "Users can view rag_documents" ON public.rag_documents
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR is_master_user() OR is_global = true);

CREATE POLICY "Users can insert rag_documents" ON public.rag_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_global = false AND client_id = get_user_client_id())
    OR (is_global = true AND is_master_user())
  );

CREATE POLICY "Users can update rag_documents" ON public.rag_documents
  FOR UPDATE TO authenticated
  USING (
    (is_global = false AND client_id = get_user_client_id())
    OR is_master_user()
  );

CREATE POLICY "Users can delete rag_documents" ON public.rag_documents
  FOR DELETE TO authenticated
  USING (
    (is_global = false AND client_id = get_user_client_id())
    OR is_master_user()
  );

-- Drop existing RLS policies on rag_embeddings
DROP POLICY IF EXISTS "Users can view rag_embeddings in their client" ON public.rag_embeddings;
DROP POLICY IF EXISTS "Users can insert rag_embeddings in their client" ON public.rag_embeddings;
DROP POLICY IF EXISTS "Users can update rag_embeddings in their client" ON public.rag_embeddings;
DROP POLICY IF EXISTS "Users can delete rag_embeddings in their client" ON public.rag_embeddings;

-- Recreate rag_embeddings policies with is_global support
CREATE POLICY "Users can view rag_embeddings" ON public.rag_embeddings
  FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR is_master_user() OR is_global = true);

CREATE POLICY "Users can insert rag_embeddings" ON public.rag_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_global = false AND client_id = get_user_client_id())
    OR (is_global = true AND is_master_user())
  );

CREATE POLICY "Users can update rag_embeddings" ON public.rag_embeddings
  FOR UPDATE TO authenticated
  USING (
    (is_global = false AND client_id = get_user_client_id())
    OR is_master_user()
  );

CREATE POLICY "Users can delete rag_embeddings" ON public.rag_embeddings
  FOR DELETE TO authenticated
  USING (
    (is_global = false AND client_id = get_user_client_id())
    OR is_master_user()
  );

-- Update match_rag_documents to include global embeddings
CREATE OR REPLACE FUNCTION public.match_rag_documents(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5,
  p_client_id text DEFAULT NULL
)
RETURNS TABLE(id uuid, document_id uuid, chunk_text text, similarity double precision)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT
    re.id,
    re.document_id,
    re.chunk_text,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM public.rag_embeddings re
  WHERE 1 - (re.embedding <=> query_embedding) > match_threshold
    AND (p_client_id IS NULL OR re.client_id = p_client_id OR re.is_global = true)
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
$$;
