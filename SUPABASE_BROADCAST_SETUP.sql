-- ============================================================================
-- UPixel CRM - Broadcast/Disparo System Setup
-- Script consolidado: cria campaign_dispatch_logs E broadcast_campaigns do zero
-- ============================================================================

-- ────────────────────────────────────────────────────────────
-- Step 1: Cria tabela campaign_dispatch_logs (per-message tracking)
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

DROP POLICY IF EXISTS "Tenant isolation on campaign_dispatch_logs" ON public.campaign_dispatch_logs;
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
-- Step 2: Adiciona colunas de agendamento em campaign_dispatch_logs
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.campaign_dispatch_logs
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_min_seconds INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delay_max_seconds INTEGER DEFAULT 8;

CREATE INDEX IF NOT EXISTS idx_cdl_scheduled_at
  ON public.campaign_dispatch_logs(scheduled_at)
  WHERE status = 'scheduled';

-- ────────────────────────────────────────────────────────────
-- Step 3: Cria tabela mestre broadcast_campaigns
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT        NOT NULL,
  tenant_id         UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  channel           TEXT        NOT NULL DEFAULT 'whatsapp',
  route             TEXT        NOT NULL DEFAULT 'free',
  message_content   TEXT,
  template_id       TEXT,
  lead_ids          UUID[]      NOT NULL DEFAULT '{}',
  total_recipients  INTEGER     NOT NULL DEFAULT 0,
  scheduled_at      TIMESTAMPTZ,
  delay_min_seconds INTEGER     NOT NULL DEFAULT 3,
  delay_max_seconds INTEGER     NOT NULL DEFAULT 8,
  status            TEXT        NOT NULL DEFAULT 'draft',
  sent_count        INTEGER     NOT NULL DEFAULT 0,
  failed_count      INTEGER     NOT NULL DEFAULT 0,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_campaigns_status_check CHECK (
    status IN ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_bc_client_id    ON public.broadcast_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_bc_status       ON public.broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bc_scheduled_at ON public.broadcast_campaigns(scheduled_at) WHERE status = 'scheduled';

ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on broadcast_campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Tenant isolation on broadcast_campaigns"
  ON public.broadcast_campaigns FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

-- ============================================================================
-- Verificação (descomente para conferir)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('campaign_dispatch_logs', 'broadcast_campaigns');
