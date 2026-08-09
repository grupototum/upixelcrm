-- ════════════════════════════════════════════════════════════════════
-- SCRIPT DE CORREÇÕES — UPixelCRM
-- Roda automações + cria estrutura de cadência (sequências de msgs)
--
-- Idempotente: pode rodar quantas vezes quiser.
--
-- Como usar:
--   1. Abra Supabase Dashboard → SQL Editor → New Query
--   2. Cole TODO este arquivo
--   3. Clique em "Run"
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- PARTE 1 — Fix RLS das automações (corrige 400 ao criar fluxo)
-- ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Tenant isolation on automations" ON public.automations;
CREATE POLICY "Tenant isolation on automations"
  ON public.automations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  );

DROP POLICY IF EXISTS "Tenant isolation on automation_rules" ON public.automation_rules;
CREATE POLICY "Tenant isolation on automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  );


-- ────────────────────────────────────────────────────────────────────
-- PARTE 2 — Garante colunas retry_count e next_retry_at na queue
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS retry_count    INTEGER     NOT NULL DEFAULT 0;

ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_automation_queue_retry
  ON public.automation_queue (status, next_retry_at)
  WHERE status = 'pending';


-- ────────────────────────────────────────────────────────────────────
-- PARTE 3 — Tabelas de cadência de mensagens (Sequências)
-- ────────────────────────────────────────────────────────────────────

-- 3.1 — message_sequences
CREATE TABLE IF NOT EXISTS public.message_sequences (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             TEXT        NOT NULL,
  tenant_id             UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  description           TEXT,
  channel               TEXT        NOT NULL DEFAULT 'whatsapp', -- whatsapp | email
  active                BOOLEAN     NOT NULL DEFAULT false,
  trigger_column_id     UUID,
  trigger_pipeline_id   UUID,
  enrollment_count      INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_sequences_client_id      ON public.message_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_message_sequences_active         ON public.message_sequences(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_message_sequences_trigger_column ON public.message_sequences(trigger_column_id);

-- 3.2 — message_sequence_steps
CREATE TABLE IF NOT EXISTS public.message_sequence_steps (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id  UUID        NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  step_order   INTEGER     NOT NULL DEFAULT 0,
  type         TEXT        NOT NULL DEFAULT 'text',  -- text | audio | file
  content      TEXT        NOT NULL DEFAULT '',
  delay_value  INTEGER     NOT NULL DEFAULT 0,
  delay_unit   TEXT        NOT NULL DEFAULT 'minutes', -- minutes | hours | days
  metadata     JSONB       DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_sequence_steps_sequence
  ON public.message_sequence_steps(sequence_id, step_order);

-- 3.3 — sequence_enrollments
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT        NOT NULL,
  tenant_id     UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  sequence_id   UUID        NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  lead_id       UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_step  INTEGER     NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'active',  -- active | paused | completed | cancelled
  next_run_at   TIMESTAMPTZ,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_client_id ON public.sequence_enrollments(client_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead     ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_pending
  ON public.sequence_enrollments(status, next_run_at) WHERE status = 'active';


-- ────────────────────────────────────────────────────────────────────
-- PARTE 4 — RLS das tabelas de cadência
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.message_sequences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on message_sequences" ON public.message_sequences;
CREATE POLICY "Tenant isolation on message_sequences"
  ON public.message_sequences FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR public.is_master_user()
  );

DROP POLICY IF EXISTS "Tenant isolation on message_sequence_steps" ON public.message_sequence_steps;
CREATE POLICY "Tenant isolation on message_sequence_steps"
  ON public.message_sequence_steps FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_sequences s
      WHERE s.id = message_sequence_steps.sequence_id
        AND (s.client_id = public.get_user_client_id() OR public.is_master_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_sequences s
      WHERE s.id = message_sequence_steps.sequence_id
        AND (s.client_id = public.get_user_client_id() OR public.is_master_user())
    )
  );

DROP POLICY IF EXISTS "Tenant isolation on sequence_enrollments" ON public.sequence_enrollments;
CREATE POLICY "Tenant isolation on sequence_enrollments"
  ON public.sequence_enrollments FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR public.is_master_user()
  );


-- ────────────────────────────────────────────────────────────────────
-- PARTE 5 — Triggers updated_at nas tabelas de cadência
-- ────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_message_sequences_updated_at ON public.message_sequences;
CREATE TRIGGER update_message_sequences_updated_at
  BEFORE UPDATE ON public.message_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sequence_enrollments_updated_at ON public.sequence_enrollments;
CREATE TRIGGER update_sequence_enrollments_updated_at
  BEFORE UPDATE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────
-- PARTE 6 (OPCIONAL) — pg_cron para automation-worker
-- Só rode esta parte se quiser que o worker rode automaticamente a
-- cada minuto MESMO sem o frontend aberto (recomendado em produção).
--
-- ATENÇÃO: antes, em "Database → Settings → Custom Postgres Config",
-- garanta que estes valores estão setados:
--   ALTER DATABASE postgres SET app.supabase_url     = 'https://<PROJETO>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<SERVICE_ROLE_KEY>';
--
-- Se você não quiser configurar pg_cron, NÃO RODE esta parte —
-- o frontend já faz polling do worker a cada 60s via useAutomationWorker.
-- ────────────────────────────────────────────────────────────────────

-- DESCOMENTE A PARTIR DAQUI SE QUISER ATIVAR O CRON:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;
--
-- DO $$
-- DECLARE job_name TEXT := 'automation-worker';
-- BEGIN
--   IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
--     PERFORM cron.unschedule(job_name);
--   END IF;
--   PERFORM cron.schedule(
--     job_name,
--     '* * * * *',
--     $cron$
--       SELECT net.http_post(
--         url     := current_setting('app.supabase_url', true) || '/functions/v1/automation-worker',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
--         ),
--         body    := '{}'::jsonb
--       );
--     $cron$
--   );
-- END;
-- $$;


-- ────────────────────────────────────────────────────────────────────
-- Recarrega cache do PostgREST (atualiza colunas/tabelas no client JS)
-- ────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════
-- Fim. Se rodou sem erro, o sistema está pronto:
--   ✓ Criação de fluxos de automação não dá mais 400
--   ✓ automation-worker pode processar a fila (delays/retries)
--   ✓ Aba "Mensagens e Sequências" já cria/edita/ativa cadências reais
-- ════════════════════════════════════════════════════════════════════
