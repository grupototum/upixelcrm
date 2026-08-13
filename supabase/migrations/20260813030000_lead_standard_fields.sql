-- Spec: Change Log/130826/spec-campos-padrao.md
--
-- Investigação (Rotina 0) mostrou que `leads.segmento` e `leads.origin` já
-- existem e são campos fixos hoje (LeadFormModal.tsx), com UX própria
-- (segmento = texto livre; origin = select com opções fixas usado em
-- relatórios/automações). Trazê-los pro sistema de toggle arriscaria
-- comportamento já usado sem ganho real. `city` também já existe na tabela,
-- só não tinha campo no formulário de criação.
--
-- Escopo ajustado: apenas os campos genuinamente novos entram no sistema de
-- configuração (state, city, neighborhood, address, zip_code). "Segmento" e
-- "Fonte" continuam como campos fixos do formulário, fora do escopo v1.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS state        TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS zip_code     TEXT;

CREATE TABLE IF NOT EXISTS public.client_field_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL UNIQUE,
  tenant_id    UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  field_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_field_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on client_field_settings"
  ON public.client_field_settings FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

CREATE TRIGGER update_client_field_settings_updated_at
  BEFORE UPDATE ON public.client_field_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
