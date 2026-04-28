-- Suporte a agendamento e configuração avançada de disparos
-- Adiciona scheduled_at, delay_seconds e campaign_settings

ALTER TABLE public.campaign_dispatch_logs
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_min_seconds INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delay_max_seconds INTEGER DEFAULT 8;

CREATE INDEX IF NOT EXISTS idx_cdl_scheduled_at
  ON public.campaign_dispatch_logs(scheduled_at) WHERE status = 'scheduled';

-- Tabela mestre de campanhas (uma por disparo, agregando os logs)
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
