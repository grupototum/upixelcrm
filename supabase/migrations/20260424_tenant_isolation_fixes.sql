-- ════════════════════════════════════════════════════════════
-- Fix: Tenant Isolation + RBAC gaps — uPixel CRM
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. audit_log: adicionar tenant_id e corrigir RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON public.audit_log(tenant_id);

-- Remover policies antigas
DROP POLICY IF EXISTS "Supervisors can read audit log" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;

-- Nova policy de leitura: isolada por tenant
CREATE POLICY "Tenant isolation on audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  );

-- Nova policy de escrita: isolada por tenant
CREATE POLICY "Tenant scoped audit insert"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master_user() OR
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id()
  );


-- ────────────────────────────────────────────────────────────
-- 2. profiles: supervisor limitado ao próprio tenant
-- ────────────────────────────────────────────────────────────
-- A policy antiga "Supervisors can manage all profiles" permitia
-- que qualquer supervisor lesse/escrevesse TODOS os profiles do sistema.

DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON public.profiles;
CREATE POLICY "Supervisors can manage tenant profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles caller
      WHERE caller.id = auth.uid()
        AND caller.role = 'supervisor'
        AND (
          -- Mesmo tenant
          caller.tenant_id = profiles.tenant_id
          -- Ou ambos sem tenant (retrocompatibilidade)
          OR (caller.tenant_id IS NULL AND profiles.tenant_id IS NULL)
        )
    )
  );


-- ────────────────────────────────────────────────────────────
-- 3. Blocked users RESTRICTIVE para audit_log
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blocked_users_no_access_audit_log" ON public.audit_log;
CREATE POLICY "blocked_users_no_access_audit_log"
  ON public.audit_log AS RESTRICTIVE TO authenticated
  USING (NOT public.is_user_blocked());


-- ────────────────────────────────────────────────────────────
-- 4. RAG tables: adicionar tenant_id + RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.rag_documents
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.rag_embeddings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.rag_context
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rag_documents_tenant_id ON public.rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_tenant_id ON public.rag_embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_context_tenant_id   ON public.rag_context(tenant_id);

-- RLS para rag_documents
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on rag_documents" ON public.rag_documents;
CREATE POLICY "Tenant isolation on rag_documents"
  ON public.rag_documents FOR ALL TO authenticated
  USING (
    is_global = true OR
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- RLS para rag_embeddings
ALTER TABLE public.rag_embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on rag_embeddings" ON public.rag_embeddings;
CREATE POLICY "Tenant isolation on rag_embeddings"
  ON public.rag_embeddings FOR ALL TO authenticated
  USING (
    is_global = true OR
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- RLS para rag_context
ALTER TABLE public.rag_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation on rag_context" ON public.rag_context;
CREATE POLICY "Tenant isolation on rag_context"
  ON public.rag_context FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    public.is_master_user() OR
    tenant_id = public.get_user_tenant_id()
  );

-- Blocked user RESTRICTIVE para RAG tables
DROP POLICY IF EXISTS "blocked_users_no_access_rag_documents" ON public.rag_documents;
CREATE POLICY "blocked_users_no_access_rag_documents"
  ON public.rag_documents AS RESTRICTIVE TO authenticated
  USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_rag_embeddings" ON public.rag_embeddings;
CREATE POLICY "blocked_users_no_access_rag_embeddings"
  ON public.rag_embeddings AS RESTRICTIVE TO authenticated
  USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_rag_context" ON public.rag_context;
CREATE POLICY "blocked_users_no_access_rag_context"
  ON public.rag_context AS RESTRICTIVE TO authenticated
  USING (NOT public.is_user_blocked());


-- ────────────────────────────────────────────────────────────
-- 5. Master: acesso total FOR ALL em profiles
-- ────────────────────────────────────────────────────────────
-- A policy existente "Master can read all profiles" é apenas SELECT.
-- Master precisa de acesso completo (ler + escrever) sem depender apenas de RPCs.
DROP POLICY IF EXISTS "Master can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Master full access profiles" ON public.profiles;
CREATE POLICY "Master full access profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_master_user())
  WITH CHECK (public.is_master_user());


-- ────────────────────────────────────────────────────────────
-- 6. Organizations: adicionar tenant_id + subdomain
-- ────────────────────────────────────────────────────────────
-- Cada organization pertence a um tenant e tem seu próprio subdomínio.
-- Um tenant pode ter várias organizations.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- subdomain único por org (usado para resolução de URL)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON public.organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON public.organizations(subdomain);


-- ────────────────────────────────────────────────────────────
-- 7. Organizations: atualizar RLS para isolamento por tenant
-- ────────────────────────────────────────────────────────────
-- Manter policies existentes e adicionar isolamento por tenant

-- Master já tem "Masters can view all organizations" (SELECT).
-- Adicionar master FOR ALL:
DROP POLICY IF EXISTS "Master full access organizations" ON public.organizations;
CREATE POLICY "Master full access organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_master_user())
  WITH CHECK (public.is_master_user());

-- Supervisor pode gerenciar orgs do mesmo tenant:
DROP POLICY IF EXISTS "Supervisors manage tenant organizations" ON public.organizations;
CREATE POLICY "Supervisors manage tenant organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'supervisor'
        AND p.tenant_id = organizations.tenant_id
    )
  );

-- Leitura pública do subdomain (necessário antes do login para resolução):
DROP POLICY IF EXISTS "Public can read org by subdomain" ON public.organizations;
CREATE POLICY "Public can read org by subdomain"
  ON public.organizations FOR SELECT
  USING (true);


-- ────────────────────────────────────────────────────────────
-- 8. Função helper: derivar tenant_id de uma organization
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_org_tenant_id(org_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.organizations WHERE id = org_id
$$;
