-- Spec: Change Log/130826/spec-lead-contacts.md
-- Contatos do lado do cliente (Decisor / Atendente), distintos do
-- "Responsável" (membro interno da equipe uPixel, já existente em leads.responsible_id).
--
-- Adaptado ao schema real: client_id é TEXT, isolamento via
-- public.get_user_client_id() (não há tabela `clients`).

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  tenant_id  UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('decisor', 'atendente')),
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead_id ON public.lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_client_id ON public.lead_contacts(client_id);

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on lead_contacts"
  ON public.lead_contacts FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

CREATE TRIGGER update_lead_contacts_updated_at
  BEFORE UPDATE ON public.lead_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
