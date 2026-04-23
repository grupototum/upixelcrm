-- Cria função is_master_user() e libera acesso total para role='master'.
-- Usuários master podem ler/escrever dados de qualquer tenant.

-- ── 1. Função helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'master' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- ── 2. Corrige WITH CHECK das políticas (escrita) para master ─
-- As políticas existentes bloqueiam escrita por WITH CHECK tenant_id = get_user_tenant_id().
-- Master precisa escrever em qualquer tenant.

-- leads
DROP POLICY IF EXISTS "Tenant isolation on leads" ON public.leads;
CREATE POLICY "Tenant isolation on leads"
  ON public.leads FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- tasks
DROP POLICY IF EXISTS "Tenant isolation on tasks" ON public.tasks;
CREATE POLICY "Tenant isolation on tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- pipelines
DROP POLICY IF EXISTS "Tenant isolation on pipelines" ON public.pipelines;
CREATE POLICY "Tenant isolation on pipelines"
  ON public.pipelines FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- pipeline_columns
DROP POLICY IF EXISTS "Tenant isolation on pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "Tenant isolation on pipeline_columns"
  ON public.pipeline_columns FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- conversations
DROP POLICY IF EXISTS "Tenant isolation on conversations" ON public.conversations;
CREATE POLICY "Tenant isolation on conversations"
  ON public.conversations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- messages
DROP POLICY IF EXISTS "Tenant isolation on messages" ON public.messages;
CREATE POLICY "Tenant isolation on messages"
  ON public.messages FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- integrations
DROP POLICY IF EXISTS "Tenant isolation on integrations" ON public.integrations;
CREATE POLICY "Tenant isolation on integrations"
  ON public.integrations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- automations
DROP POLICY IF EXISTS "Tenant isolation on automations" ON public.automations;
CREATE POLICY "Tenant isolation on automations"
  ON public.automations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- automation_rules
DROP POLICY IF EXISTS "Tenant isolation on automation_rules" ON public.automation_rules;
CREATE POLICY "Tenant isolation on automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- timeline_events
DROP POLICY IF EXISTS "Tenant isolation on timeline_events" ON public.timeline_events;
CREATE POLICY "Tenant isolation on timeline_events"
  ON public.timeline_events FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- push_subscriptions
DROP POLICY IF EXISTS "Tenant isolation on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Tenant isolation on push_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- profiles: master pode ver todos
DROP POLICY IF EXISTS "Master can read all profiles" ON public.profiles;
CREATE POLICY "Master can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_master_user());

-- ── 3. Confirma usuários com role='master' ───────────────────
SELECT id, email, role, tenant_id
FROM public.profiles
WHERE role = 'master';
