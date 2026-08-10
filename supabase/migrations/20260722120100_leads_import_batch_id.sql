-- Marca cada lead com o batch da importação que o criou (feature: rollback).
-- Coluna nullable — leads pré-existentes / criados manualmente ficam NULL.
-- Sem FK rígida pra import_logs: o batch_id é gerado no cliente ANTES do log
-- ser gravado, e leads antigos não têm log correspondente. As policies de RLS
-- já existentes em leads cobrem esta coluna (não precisa de policy nova).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_leads_import_batch_id
  ON public.leads(tenant_id, import_batch_id);
