-- Allowlist de grupos WhatsApp por cliente.
-- Default deny: mensagens de grupo são droppadas, exceto se o JID do grupo
-- estiver listado para o client_id com enabled=true.

CREATE TABLE IF NOT EXISTS public.whatsapp_group_allowlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  group_jid   text NOT NULL,
  group_name  text,
  notes       text,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, group_jid)
);

CREATE INDEX IF NOT EXISTS whatsapp_group_allowlist_lookup
  ON public.whatsapp_group_allowlist (client_id, group_jid)
  WHERE enabled = true;

CREATE OR REPLACE FUNCTION public.set_whatsapp_group_allowlist_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_group_allowlist_updated_at
  ON public.whatsapp_group_allowlist;
CREATE TRIGGER trg_whatsapp_group_allowlist_updated_at
  BEFORE UPDATE ON public.whatsapp_group_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.set_whatsapp_group_allowlist_updated_at();

ALTER TABLE public.whatsapp_group_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_group_allowlist_client_select
  ON public.whatsapp_group_allowlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = whatsapp_group_allowlist.client_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY whatsapp_group_allowlist_client_modify
  ON public.whatsapp_group_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = whatsapp_group_allowlist.client_id
        AND cu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = whatsapp_group_allowlist.client_id
        AND cu.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.whatsapp_group_allowlist IS
  'Grupos WhatsApp autorizados a serem processados pelo bot por client_id. Default deny — mensagens de grupos nao listados sao droppadas em whatsapp-webhook.';
