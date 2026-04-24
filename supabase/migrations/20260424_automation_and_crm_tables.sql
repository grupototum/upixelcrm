-- ════════════════════════════════════════════════════════════
-- Novas tabelas: campos personalizados, tags, automação engine
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. custom_field_definitions — definições de campos por cliente
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT        NOT NULL,
  tenant_id        UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  slug             TEXT        NOT NULL,
  field_type       TEXT        NOT NULL DEFAULT 'text',
  options          JSONB       DEFAULT '[]'::jsonb,
  is_required      BOOLEAN     NOT NULL DEFAULT false,
  visible_pipelines JSONB      DEFAULT '[]'::jsonb,
  display_order    INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_client_id ON public.custom_field_definitions(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_tenant_id ON public.custom_field_definitions(tenant_id);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on custom_field_definitions"
  ON public.custom_field_definitions FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

CREATE TRIGGER update_custom_field_definitions_updated_at
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- 2. tags — catálogo de tags por cliente
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  TEXT        NOT NULL,
  tenant_id  UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#6366f1',
  category   TEXT        NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_client_id ON public.tags(client_id);
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON public.tags(tenant_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on tags"
  ON public.tags FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- 3. automation_executions — log de execuções do engine visual
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT,
  tenant_id     UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID        NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  lead_id       UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  node_id       TEXT        NOT NULL,
  node_type     TEXT        NOT NULL,
  input         JSONB       DEFAULT '{}'::jsonb,
  output        JSONB       DEFAULT '{}'::jsonb,
  status        TEXT        NOT NULL DEFAULT 'success',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_client_id    ON public.automation_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON public.automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_lead_id      ON public.automation_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created_at   ON public.automation_executions(created_at DESC);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on automation_executions"
  ON public.automation_executions FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );


-- ────────────────────────────────────────────────────────────
-- 4. automation_queue — fila de execuções com delay
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT,
  tenant_id     UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID        NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  lead_id       UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  node_id       TEXT        NOT NULL,
  context       JSONB       DEFAULT '{}'::jsonb,
  status        TEXT        NOT NULL DEFAULT 'pending',
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at   TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_queue_status_scheduled ON public.automation_queue(status, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_automation_queue_client_id ON public.automation_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_queue_lead_id   ON public.automation_queue(lead_id);

ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on automation_queue"
  ON public.automation_queue FOR ALL TO authenticated
  USING (public.is_master_user())
  WITH CHECK (public.is_master_user());
