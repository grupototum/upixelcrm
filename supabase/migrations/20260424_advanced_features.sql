-- ════════════════════════════════════════════════════════════
-- Advanced features: GIN index, cron, broadcast_lists,
-- campaign_dispatch_logs, field_changed trigger, queue retry
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. GIN index on leads.custom_fields for fast JSONB queries
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields_gin
  ON public.leads USING GIN (custom_fields jsonb_path_ops);

-- ────────────────────────────────────────────────────────────
-- 2. Retry columns on automation_queue
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS retry_count    INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_automation_queue_retry
  ON public.automation_queue (status, next_retry_at)
  WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────
-- 3. broadcast_lists — saved filter presets as broadcast targets
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcast_lists (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT        NOT NULL,
  tenant_id        UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  description      TEXT,
  filter_criteria  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  lead_count       INTEGER     NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_lists_client_id ON public.broadcast_lists(client_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_lists_tenant_id ON public.broadcast_lists(tenant_id);

ALTER TABLE public.broadcast_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on broadcast_lists"
  ON public.broadcast_lists FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

CREATE TRIGGER update_broadcast_lists_updated_at
  BEFORE UPDATE ON public.broadcast_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 4. campaign_dispatch_logs — per-message dispatch tracking
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_dispatch_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        TEXT        NOT NULL,
  tenant_id        UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_name    TEXT        NOT NULL,
  campaign_id      TEXT,
  lead_id          UUID        REFERENCES public.leads(id) ON DELETE SET NULL,
  phone            TEXT,
  channel          TEXT        NOT NULL DEFAULT 'whatsapp',
  status           TEXT        NOT NULL DEFAULT 'pending',
  template_id      TEXT,
  message_content  TEXT,
  error            TEXT,
  retry_count      INTEGER     NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cdl_client_id     ON public.campaign_dispatch_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_cdl_campaign_id   ON public.campaign_dispatch_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cdl_lead_id       ON public.campaign_dispatch_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_cdl_status        ON public.campaign_dispatch_logs(status);
CREATE INDEX IF NOT EXISTS idx_cdl_created_at    ON public.campaign_dispatch_logs(created_at DESC);

ALTER TABLE public.campaign_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on campaign_dispatch_logs"
  ON public.campaign_dispatch_logs FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

-- ────────────────────────────────────────────────────────────
-- 5. PostgreSQL trigger: record field_changed timeline event
--    when leads.custom_fields JSONB changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_lead_custom_fields_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.custom_fields IS DISTINCT FROM NEW.custom_fields THEN
    INSERT INTO public.timeline_events (
      lead_id,
      client_id,
      tenant_id,
      type,
      content
    ) VALUES (
      NEW.id,
      NEW.client_id,
      NEW.tenant_id,
      'field_changed',
      jsonb_build_object(
        'previous', OLD.custom_fields,
        'current',  NEW.custom_fields
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_custom_fields_changed ON public.leads;
CREATE TRIGGER trg_lead_custom_fields_changed
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.on_lead_custom_fields_changed();

-- ────────────────────────────────────────────────────────────
-- 6. pg_cron: schedule automation-worker every minute
--    Requires pg_cron and pg_net extensions enabled in Supabase
--    Dashboard → Database → Extensions
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old schedule if it exists
    PERFORM cron.unschedule('automation-worker')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-worker');

    PERFORM cron.schedule(
      'automation-worker',
      '* * * * *',
      $cron$
        SELECT net.http_post(
          url       := current_setting('app.supabase_url', true) || '/functions/v1/automation-worker',
          headers   := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
          ),
          body      := '{}'::jsonb
        );
      $cron$
    );
  END IF;
END;
$$;
