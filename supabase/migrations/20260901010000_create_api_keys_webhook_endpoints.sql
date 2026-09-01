-- Fix 01: "Erro ao criar chave de API: [object Object]" — causa raiz é a
-- ausência das tabelas api_keys e webhook_endpoints no schema (schema
-- drift, ver comentário em src/services/integrations.ts). Cria as duas
-- seguindo o padrão de isolamento multi-tenant já usado em goals.sql
-- (client_id TEXT + RLS via public.get_user_client_id()/is_master_user()).
--
-- client_id tem DEFAULT public.get_user_client_id() porque o frontend
-- (ApiSettingsModal.tsx, WebhookSettingsModal.tsx) não envia client_id no
-- insert — a coluna é preenchida no banco a partir do usuário autenticado.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT NOT NULL DEFAULT public.get_user_client_id(),
  name          TEXT NOT NULL,
  token_preview TEXT NOT NULL,
  token_hash    TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON public.api_keys(client_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on api_keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT NOT NULL DEFAULT public.get_user_client_id(),
  url         TEXT NOT NULL,
  description TEXT,
  secret      TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_client_id ON public.webhook_endpoints(client_id);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on webhook_endpoints"
  ON public.webhook_endpoints FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

NOTIFY pgrst, 'reload schema';
