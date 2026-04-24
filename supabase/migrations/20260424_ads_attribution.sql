-- ─────────────────────────────────────────────────────────────
-- Ads Attribution & Campaign Cache Migration
-- ─────────────────────────────────────────────────────────────

-- 1. Attribution columns on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source    TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium    TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign  TEXT,
  ADD COLUMN IF NOT EXISTS utm_content   TEXT,
  ADD COLUMN IF NOT EXISTS utm_term      TEXT,
  ADD COLUMN IF NOT EXISTS ad_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_adset_id   TEXT,
  ADD COLUMN IF NOT EXISTS ad_id         TEXT,
  ADD COLUMN IF NOT EXISTS fbclid        TEXT,
  ADD COLUMN IF NOT EXISTS gclid         TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign    ON public.leads (client_id, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_ad_campaign_id  ON public.leads (client_id, ad_campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_fbclid          ON public.leads (fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_gclid           ON public.leads (gclid)  WHERE gclid  IS NOT NULL;

-- 2. Ad campaigns cache (Meta + Google)
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('meta', 'google')),
  external_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  objective       TEXT,
  channel_type    TEXT,
  budget_daily    NUMERIC,
  budget_lifetime NUMERIC,
  start_date      DATE,
  end_date        DATE,
  -- aggregated metrics (refreshed on sync)
  spend           NUMERIC DEFAULT 0,
  impressions     BIGINT  DEFAULT 0,
  clicks          BIGINT  DEFAULT 0,
  reach           BIGINT  DEFAULT 0,
  cpc             NUMERIC DEFAULT 0,
  ctr             NUMERIC DEFAULT 0,
  cpm             NUMERIC DEFAULT 0,
  conversions     NUMERIC DEFAULT 0,
  leads_count     NUMERIC DEFAULT 0,
  cost_per_lead   NUMERIC DEFAULT 0,
  revenue         NUMERIC DEFAULT 0,
  raw_data        JSONB   DEFAULT '{}',
  date_range      JSONB   DEFAULT '{}',   -- { since, until } used in last sync
  synced_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (client_id, platform, external_id)
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_ad_campaigns_select" ON public.ad_campaigns
  FOR SELECT USING (client_id = get_user_client_id() OR is_master_user());

CREATE POLICY "tenant_ad_campaigns_insert" ON public.ad_campaigns
  FOR INSERT WITH CHECK (client_id = get_user_client_id() OR is_master_user());

CREATE POLICY "tenant_ad_campaigns_update" ON public.ad_campaigns
  FOR UPDATE USING (client_id = get_user_client_id() OR is_master_user());

CREATE POLICY "tenant_ad_campaigns_delete" ON public.ad_campaigns
  FOR DELETE USING (client_id = get_user_client_id() OR is_master_user());

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_client_platform ON public.ad_campaigns (client_id, platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_synced_at       ON public.ad_campaigns (client_id, synced_at DESC);
