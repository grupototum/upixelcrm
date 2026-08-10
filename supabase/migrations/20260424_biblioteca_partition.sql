-- Adiciona coluna partition em rag_documents para separar Wiki de RAG
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS partition TEXT NOT NULL DEFAULT 'rag';

CREATE INDEX IF NOT EXISTS idx_rag_documents_partition ON public.rag_documents(partition);

-- Documentos existentes sem partição ficam como 'rag' (retrocompatibilidade)
UPDATE public.rag_documents SET partition = 'rag' WHERE partition IS NULL OR partition = '';
