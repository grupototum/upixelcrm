-- ════════════════════════════════════════════════════════════
-- Multi-tenant por subdomínio — uPixel CRM
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. Tabela tenants
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  subdomain   TEXT        NOT NULL UNIQUE
                          CHECK (subdomain ~ '^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$'),
  plan        TEXT        NOT NULL DEFAULT 'free',
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode consultar tenants pelo subdomain (necessário antes do login)
CREATE POLICY "Public can read tenants"
  ON public.tenants FOR SELECT
  USING (true);

-- Apenas owner pode atualizar
CREATE POLICY "Owner can update tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Apenas owner pode deletar
CREATE POLICY "Owner can delete tenant"
  ON public.tenants FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Usuário autenticado pode inserir (o owner_id será setado logo após o signUp)
CREATE POLICY "Authenticated can insert tenant"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- 2. Adicionar tenant_id nas tabelas principais
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_columns
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Índices para performance nas queries por tenant
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id           ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id           ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id       ON public.pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_columns_tenant_id ON public.pipeline_columns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id   ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id        ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id    ON public.integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_tenant_id     ON public.automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_id ON public.automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_id ON public.timeline_events(tenant_id);


-- ────────────────────────────────────────────────────────────
-- 3. Função get_user_tenant_id()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ────────────────────────────────────────────────────────────
-- 4. Atualizar handle_new_user para aceitar tenant_id
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_client_id TEXT;
BEGIN
  -- tenant_id vem de raw_user_meta_data quando o signup é feito via LandingPage
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- client_id = tenant_id::text para manter retrocompatibilidade com RLS existente
  -- Se não há tenant_id (usuário avulso), usa o próprio user id
  IF v_tenant_id IS NOT NULL THEN
    v_client_id := v_tenant_id::text;
  ELSE
    v_client_id := NEW.id::text;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    v_client_id,
    v_tenant_id
  );
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Políticas RLS por tenant_id (segunda camada, complementar)
-- ────────────────────────────────────────────────────────────

-- leads
CREATE POLICY "Tenant isolation on leads"
  ON public.leads FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- tasks
CREATE POLICY "Tenant isolation on tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- pipelines
CREATE POLICY "Tenant isolation on pipelines"
  ON public.pipelines FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- pipeline_columns
CREATE POLICY "Tenant isolation on pipeline_columns"
  ON public.pipeline_columns FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- conversations
CREATE POLICY "Tenant isolation on conversations"
  ON public.conversations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- messages
CREATE POLICY "Tenant isolation on messages"
  ON public.messages FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- integrations
CREATE POLICY "Tenant isolation on integrations"
  ON public.integrations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- automations
CREATE POLICY "Tenant isolation on automations"
  ON public.automations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- automation_rules
CREATE POLICY "Tenant isolation on automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- timeline_events
CREATE POLICY "Tenant isolation on timeline_events"
  ON public.timeline_events FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- push_subscriptions
CREATE POLICY "Tenant isolation on push_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );
