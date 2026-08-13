-- Spec: Change Log/130826/spec-numeros-secundarios.md
-- Números adicionais por lead, com categoria. O campo `leads.phone` original
-- não é alterado (spec explicitamente evita migrar o número principal em v1).
--
-- Adaptado ao schema real do projeto: client_id é TEXT (não FK para uma
-- tabela `clients`, que não existe aqui) e o isolamento usa
-- public.get_user_client_id(), como em custom_field_definitions/tags.

CREATE TABLE IF NOT EXISTS public.lead_phones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  tenant_id  UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  number     TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('celular', 'fixo', 'whatsapp', 'comercial', 'outro')),
  label      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_phones_lead_id ON public.lead_phones(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_phones_client_id ON public.lead_phones(client_id);

ALTER TABLE public.lead_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on lead_phones"
  ON public.lead_phones FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());
