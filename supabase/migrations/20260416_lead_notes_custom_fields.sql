-- supabase/migrations/20260416_lead_notes_custom_fields.sql
-- Adicionar persistência persistente para anotações e campos customizáveis na tabela principal de leads

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS notes_local TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.notes_local IS 'Notas salvas referentes ao Lead na view de Perfil';
COMMENT ON COLUMN public.leads.custom_fields IS 'Dicionário chave-valor persistindo meta campos (ex: totum_custom_fields) do Lead';
