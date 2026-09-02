-- ============================================================================
-- 20260902000100_rls_hotfix_tenant_isolation.sql
-- Auditoria de segurança 2026-09-01 — item 1: fechar brechas de isolamento
-- multi-tenant. Idempotente (DROP IF EXISTS / OR REPLACE).
--
-- (a) Policies "Tenant isolation on <tabela>" (+ "Tenant scoped audit insert")
--     tinham `tenant_id IS NULL OR ...` no USING/WITH CHECK: qualquer usuário
--     autenticado lia/gravava linhas sem tenant. Recriadas sem essa cláusula;
--     resto do texto copiado literalmente de pg_policies (prod 2026-09-01),
--     inclusive `is_global = true` em rag_documents/rag_embeddings e a
--     ausência de is_master_user() no WITH CHECK de integrations e
--     push_subscriptions. `leads` já não tinha a cláusula NULL (não recriada).
--
-- (b) Backfill ANTES de (a), senão as linhas com tenant_id NULL somem para os
--     próprios donos. Mapeamento genérico client_id → tenant_id por join
--     (nenhum UUID hardcoded), nesta ordem de evidência, todas acumuladas num
--     mapa e usadas só quando o client_id aponta para EXATAMENTE um tenant:
--       1. tenants.id::text        (convenção atual: client_id = tenant id)
--       2. profiles.id::text       (client_id legado = id do usuário dono)
--       3. pares (client_id, tenant_id) já preenchidos em qualquer uma das 14
--          tabelas (ex.: 'c1' → tenant totum, consistente em tasks,
--          integrations, pipelines, automations)
--     Contagem em prod (2026-09-01) do que o mapa resolve: leads 76,
--     conversations 2, integrations 1, tasks 1 ('c1'), push_subscriptions 1,
--     automations 1, automation_rules 1, timeline_events 84.
--     FICAM SEM MAPEAMENTO (nada é deletado; ficam invisíveis para
--     authenticated, visíveis para master/service role, para triagem manual):
--       tasks 'demo1' 6 · pipelines 'demo1' 2 · pipeline_columns 'demo1' 8 ·
--       timeline_events 'default' 234 e 'demo1' 5 · automations 'master' 1 ·
--       automation_rules 'master' 1  (client_ids de seed/demo sem tenant).
--     Efeito colateral aceito: triggers update_*_updated_at bumpam updated_at
--     das linhas backfilladas. Nenhum outro trigger de UPDATE reage a
--     tenant_id (verificado: fn_lead_field_changed só custom_fields,
--     schedule_csat_on_resolve só status).
--
-- (c) Policies de signup em tenants/organizations:
--       "Anon can delete unowned … (signup rollback)"  → qualquer usuário
--         autenticado apagava tenant/org sem dono.
--       "Authenticated can claim unowned …"            → qualquer usuário
--         autenticado virava dono de tenant/org sem dono (com o trigger de
--         20260730 isso = supervisor aprovado no tenant alheio).
--     Decisão: REMOVER as quatro, sem substituto por `created_by`. Motivo: o
--     INSERT em tenants/organizations já é só para authenticated desde
--     20260531000001 — o SignupPage (que inseria o tenant como anon ANTES do
--     signUp) está quebrado em prod desde então (único signup pela página:
--     2026-04-23). O fluxo foi reordenado no frontend (signUp → INSERT com
--     owner_id = auth.uid()), então "tenant sem dono" deixa de existir e não
--     há o que reivindicar/rollbackar como anon. Rollback do signup usa as
--     policies "Owner can delete tenant" / "Owners can delete their
--     organization" (já existentes). INSERT restrito a owner_id = auth.uid().
--     Promoção do dono: trigger em 20260902000200.
--
-- (d) enforce_profile_immutable_fields passa a proteger também tenant_id,
--     approval_status e organization_id. Exceções: service role (JWT role
--     service_role — admin-create-user faz UPDATE desses campos), contexto
--     sem JWT (migrações), flag app.bypass_immutable (RPCs admin_*/owner_* e
--     triggers de dono) e is_master_user() SÓ para os três campos novos —
--     role/is_blocked/client_id mantêm a regra atual (master usa RPC).
--     Efeito conhecido: OrganizationSection.handleLeaveOrg já falhava (muda
--     client_id); continua falhando — precisa de RPC (fora deste hotfix).
--
-- ROLLBACK
--   (a) recriar cada policy com o texto anterior (pg_policies snapshot no
--       cabeçalho de cada bloco abaixo: basta reinserir `(tenant_id IS NULL) OR`).
--   (b) irreversível por design (não se sabe quais linhas eram NULL) — se
--       necessário, `UPDATE <tabela> SET tenant_id = NULL WHERE updated_at >=
--       '<timestamp da aplicação>' AND client_id IN ('c1', ...)` com critério
--       manual. Nenhuma linha é apagada.
--   (c) reaplicar 20260428_allow_anon_organization_insert.sql (as 4 policies)
--       e 20260531000001 (INSERT com auth.uid() IS NOT NULL).
--   (d) reaplicar o corpo anterior da função (20260729130016_restore_bypass_
--       in_profile_trigger.sql).
-- ============================================================================

-- ── (b) Backfill tenant_id NULL ────────────────────────────────────────────
DO $$
DECLARE
  _tables text[] := ARRAY[
    'leads','tasks','conversations','integrations','messages','pipelines',
    'pipeline_columns','timeline_events','automations','automation_rules',
    'push_subscriptions','rag_context','rag_documents','rag_embeddings'];
  _t text;
  _n bigint;
BEGIN
  CREATE TEMP TABLE _ctm_raw (client_id text, tenant_id uuid) ON COMMIT DROP;
  INSERT INTO _ctm_raw SELECT id::text, id FROM public.tenants;
  INSERT INTO _ctm_raw SELECT id::text, tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL;
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format(
      'INSERT INTO _ctm_raw SELECT DISTINCT client_id, tenant_id FROM public.%I
        WHERE tenant_id IS NOT NULL AND client_id IS NOT NULL', _t);
  END LOOP;

  -- Só client_ids que apontam para exatamente um tenant.
  CREATE TEMP TABLE _ctm ON COMMIT DROP AS
    SELECT client_id, (array_agg(DISTINCT tenant_id))[1] AS tenant_id
      FROM _ctm_raw
     GROUP BY client_id
    HAVING count(DISTINCT tenant_id) = 1;

  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format(
      'UPDATE public.%I x SET tenant_id = m.tenant_id
         FROM _ctm m
        WHERE x.tenant_id IS NULL AND x.client_id = m.client_id', _t);
    GET DIAGNOSTICS _n = ROW_COUNT;
    RAISE NOTICE 'backfill tenant_id em %: % linha(s)', _t, _n;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _n;
    IF _n > 0 THEN
      RAISE NOTICE '  -> % ainda com tenant_id NULL em % (ficam invisiveis para authenticated)', _n, _t;
    END IF;
  END LOOP;
END $$;

-- ── (a) Policies sem `tenant_id IS NULL` ───────────────────────────────────
-- Padrão A: USING (tid OR master) / WITH CHECK (tid OR master)
DROP POLICY IF EXISTS "Tenant isolation on automation_rules" ON public.automation_rules;
CREATE POLICY "Tenant isolation on automation_rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()));

DROP POLICY IF EXISTS "Tenant isolation on automations" ON public.automations;
CREATE POLICY "Tenant isolation on automations" ON public.automations
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()));

-- Padrão B: USING (tid OR master) / WITH CHECK (master OR tid)
DROP POLICY IF EXISTS "Tenant isolation on conversations" ON public.conversations;
CREATE POLICY "Tenant isolation on conversations" ON public.conversations
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on messages" ON public.messages;
CREATE POLICY "Tenant isolation on messages" ON public.messages
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "Tenant isolation on pipeline_columns" ON public.pipeline_columns
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on pipelines" ON public.pipelines;
CREATE POLICY "Tenant isolation on pipelines" ON public.pipelines
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on rag_context" ON public.rag_context;
CREATE POLICY "Tenant isolation on rag_context" ON public.rag_context
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on tasks" ON public.tasks;
CREATE POLICY "Tenant isolation on tasks" ON public.tasks
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on timeline_events" ON public.timeline_events;
CREATE POLICY "Tenant isolation on timeline_events" ON public.timeline_events
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

-- Padrão C: USING (tid OR master) / WITH CHECK (tid)  — sem master (como estava)
DROP POLICY IF EXISTS "Tenant isolation on integrations" ON public.integrations;
CREATE POLICY "Tenant isolation on integrations" ON public.integrations
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

DROP POLICY IF EXISTS "Tenant isolation on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Tenant isolation on push_subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

-- Padrão D: RAG com is_global
DROP POLICY IF EXISTS "Tenant isolation on rag_documents" ON public.rag_documents;
CREATE POLICY "Tenant isolation on rag_documents" ON public.rag_documents
  FOR ALL TO authenticated
  USING ((is_global = true) OR (tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

DROP POLICY IF EXISTS "Tenant isolation on rag_embeddings" ON public.rag_embeddings;
CREATE POLICY "Tenant isolation on rag_embeddings" ON public.rag_embeddings
  FOR ALL TO authenticated
  USING ((is_global = true) OR (tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()))
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

-- audit_log: SELECT + INSERT separados
DROP POLICY IF EXISTS "Tenant isolation on audit_log" ON public.audit_log;
CREATE POLICY "Tenant isolation on audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING ((tenant_id = (SELECT get_user_tenant_id())) OR (SELECT is_master_user()));

DROP POLICY IF EXISTS "Tenant scoped audit insert" ON public.audit_log;
CREATE POLICY "Tenant scoped audit insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_master_user()) OR (tenant_id = (SELECT get_user_tenant_id())));

-- ── (c) Signup: fim do "tenant/org sem dono" ───────────────────────────────
DROP POLICY IF EXISTS "Anon can delete unowned tenant (signup rollback)" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated can claim unowned tenant" ON public.tenants;
DROP POLICY IF EXISTS "Anon can delete unowned organization (signup rollback)" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated can claim unowned organization" ON public.organizations;

-- INSERT só com owner_id = quem insere (era só `auth.uid() IS NOT NULL`, o que
-- permitia inserir tenant/org com owner_id de terceiro).
DROP POLICY IF EXISTS "Authenticated users can insert tenant (self-service signup)" ON public.tenants;
CREATE POLICY "Authenticated users can insert tenant (self-service signup)" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- Nome truncado pelo Postgres para 63 chars — o DROP com o nome completo casa.
DROP POLICY IF EXISTS "Authenticated users can insert organization (self-service signup)" ON public.organizations;
-- "Authenticated users can create organizations" (WITH CHECK owner_id = auth.uid()) já cobre o INSERT.

-- ── (d) enforce_profile_immutable_fields ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _claims text := NULLIF(current_setting('request.jwt.claims', true), '');
BEGIN
  -- Migrações / sem JWT / service role (edge functions com service key)
  IF current_setting('role', true) IN ('rls_none', 'service_role')
     OR _claims IS NULL
     OR (_claims::jsonb->>'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- RPCs admin_*/owner_* e triggers de dono setam o flag
  IF current_setting('app.bypass_immutable', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role field directly';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Cannot change is_blocked field directly';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Cannot change client_id field directly';
  END IF;

  -- Campos de escopo/aprovação: só master (ou os bypasses acima)
  IF (NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
      OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id)
     AND NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Cannot change tenant_id/approval_status/organization_id directly';
  END IF;
  RETURN NEW;
END;
$function$;
