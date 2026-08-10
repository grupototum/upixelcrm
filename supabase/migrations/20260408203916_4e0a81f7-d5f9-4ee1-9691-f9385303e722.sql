
-- Create rag_documents table
CREATE TABLE public.rag_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'client_info',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rag_context table
CREATE TABLE public.rag_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  document_id UUID REFERENCES public.rag_documents(id) ON DELETE SET NULL,
  query TEXT NOT NULL DEFAULT '',
  similarity_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rag_documents in their client" ON public.rag_documents FOR SELECT TO authenticated USING ((client_id = get_user_client_id()) OR is_master_user());
CREATE POLICY "Users can insert rag_documents in their client" ON public.rag_documents FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can update rag_documents in their client" ON public.rag_documents FOR UPDATE TO authenticated USING ((client_id = get_user_client_id()) OR is_master_user());
CREATE POLICY "Users can delete rag_documents in their client" ON public.rag_documents FOR DELETE TO authenticated USING ((client_id = get_user_client_id()) OR is_master_user());

CREATE POLICY "Users can view rag_context in their client" ON public.rag_context FOR SELECT TO authenticated USING ((client_id = get_user_client_id()) OR is_master_user());
CREATE POLICY "Users can insert rag_context in their client" ON public.rag_context FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can delete rag_context in their client" ON public.rag_context FOR DELETE TO authenticated USING ((client_id = get_user_client_id()) OR is_master_user());

CREATE TRIGGER update_rag_documents_updated_at BEFORE UPDATE ON public.rag_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
