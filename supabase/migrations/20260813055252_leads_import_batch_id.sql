-- Espelha a migration registrada em produção sob esta versão (aplicada direto
-- no banco, sem arquivo correspondente no git até este commit).
-- Conteúdo idêntico ao de supabase/migrations/20260722120100_leads_import_batch_id.sql,
-- verificado via information_schema em produção.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_leads_import_batch_id
  ON public.leads(tenant_id, import_batch_id);
