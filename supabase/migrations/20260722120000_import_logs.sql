-- Histórico de importações de leads (feature: histórico + rollback).
-- Mesmo padrão de isolamento multi-tenant das demais tabelas do CRM:
-- client_id TEXT (chave primária de isolamento) + tenant_id UUID complementar.

CREATE TABLE IF NOT EXISTS public.import_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT NOT NULL,
  tenant_id         UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           UUID,
  batch_id          UUID NOT NULL,
  filename          TEXT,
  total_rows        INTEGER NOT NULL DEFAULT 0,
  inserted          INTEGER NOT NULL DEFAULT 0,
  updated           INTEGER NOT NULL DEFAULT 0,
  skipped           INTEGER NOT NULL DEFAULT 0,
  skipped_no_name   INTEGER NOT NULL DEFAULT 0,
  skipped_duplicate INTEGER NOT NULL DEFAULT 0,
  errors            INTEGER NOT NULL DEFAULT 0,
  rolled_back_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_client_id ON public.import_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_tenant_id ON public.import_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_batch_id  ON public.import_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created   ON public.import_logs(client_id, created_at DESC);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view import_logs in their client" ON public.import_logs;
CREATE POLICY "Users can view import_logs in their client"
  ON public.import_logs FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert import_logs in their client" ON public.import_logs;
CREATE POLICY "Users can insert import_logs in their client"
  ON public.import_logs FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update import_logs in their client" ON public.import_logs;
CREATE POLICY "Users can update import_logs in their client"
  ON public.import_logs FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete import_logs in their client" ON public.import_logs;
CREATE POLICY "Users can delete import_logs in their client"
  ON public.import_logs FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user());
