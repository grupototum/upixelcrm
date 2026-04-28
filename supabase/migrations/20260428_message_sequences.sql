-- ════════════════════════════════════════════════════════════
-- Cadência de mensagens (sequências automatizadas)
--
-- Estrutura:
--   message_sequences         → cabeçalho da sequência (nome, canal,
--                                pipeline trigger, ativa)
--   message_sequence_steps    → etapas ordenadas (texto/áudio/arquivo
--                                com delay relativo)
--   sequence_enrollments      → matrículas de leads em sequências
--                                (estado de execução)
-- ════════════════════════════════════════════════════════════

-- ─── 1. message_sequences ───
CREATE TABLE IF NOT EXISTS public.message_sequences (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT        NOT NULL,
  tenant_id         UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  description       TEXT,
  channel           TEXT        NOT NULL DEFAULT 'whatsapp',  -- 'whatsapp' | 'email'
  active            BOOLEAN     NOT NULL DEFAULT false,
  trigger_column_id UUID,       -- coluna que dispara a entrada na sequência
  trigger_pipeline_id UUID,
  enrollment_count  INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_sequences_client_id        ON public.message_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_message_sequences_active           ON public.message_sequences(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_message_sequences_trigger_column   ON public.message_sequences(trigger_column_id);

-- ─── 2. message_sequence_steps ───
CREATE TABLE IF NOT EXISTS public.message_sequence_steps (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id  UUID        NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  step_order   INTEGER     NOT NULL DEFAULT 0,
  type         TEXT        NOT NULL DEFAULT 'text',  -- 'text' | 'audio' | 'file'
  content      TEXT        NOT NULL DEFAULT '',
  delay_value  INTEGER     NOT NULL DEFAULT 0,        -- número, ex: 24
  delay_unit   TEXT        NOT NULL DEFAULT 'minutes', -- 'minutes' | 'hours' | 'days'
  metadata     JSONB       DEFAULT '{}'::jsonb,        -- url do arquivo, etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_sequence_steps_sequence ON public.message_sequence_steps(sequence_id, step_order);

-- ─── 3. sequence_enrollments ───
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT        NOT NULL,
  tenant_id       UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  sequence_id     UUID        NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  lead_id         UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_step    INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'completed' | 'cancelled'
  next_run_at     TIMESTAMPTZ,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_client_id ON public.sequence_enrollments(client_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead     ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_pending  ON public.sequence_enrollments(status, next_run_at) WHERE status = 'active';

-- ─── 4. RLS ───
ALTER TABLE public.message_sequences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sequence_steps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments     ENABLE ROW LEVEL SECURITY;

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

-- ─── 5. Trigger updated_at ───
DROP TRIGGER IF EXISTS update_message_sequences_updated_at ON public.message_sequences;
CREATE TRIGGER update_message_sequences_updated_at
  BEFORE UPDATE ON public.message_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sequence_enrollments_updated_at ON public.sequence_enrollments;
CREATE TRIGGER update_sequence_enrollments_updated_at
  BEFORE UPDATE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
