-- "Ignorar" duplicata: antes só existia como useState no componente (evaporava
-- no F5, o mesmo par voltava a ser sugerido). group_key é o id do grupo já
-- computado no client (ex: "phone_5511987654321", "email_fulano@x.com") —
-- mais simples que armazenar pares de lead_id, e o client já usa esse id como
-- chave de dedupe local, então a migração pra persistência é direta.
CREATE TABLE IF NOT EXISTS public.lead_duplicate_exceptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  TEXT        NOT NULL,
  tenant_id  UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  group_key  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, group_key)
);

CREATE INDEX IF NOT EXISTS idx_lead_dup_exceptions_client ON public.lead_duplicate_exceptions(client_id);

ALTER TABLE public.lead_duplicate_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view duplicate exceptions in their client" ON public.lead_duplicate_exceptions;
CREATE POLICY "Users can view duplicate exceptions in their client"
  ON public.lead_duplicate_exceptions FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert duplicate exceptions in their client" ON public.lead_duplicate_exceptions;
CREATE POLICY "Users can insert duplicate exceptions in their client"
  ON public.lead_duplicate_exceptions FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete duplicate exceptions in their client" ON public.lead_duplicate_exceptions;
CREATE POLICY "Users can delete duplicate exceptions in their client"
  ON public.lead_duplicate_exceptions FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user());
