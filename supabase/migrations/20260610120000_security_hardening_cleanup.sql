-- Clean Up pré-produção — hardening de segurança (ver docs/CLEANUP_REPORT.md)
--
-- 1) Revoga EXECUTE de funções internas (triggers) expostas via /rest/v1/rpc.
--    Triggers disparam sem checagem de EXECUTE do caller, então é seguro revogar.
--    NÃO revogamos os helpers usados em políticas RLS (get_user_tenant_id,
--    get_user_client_id, get_user_role, is_master_user, is_user_blocked,
--    get_org_tenant_id) — o caller precisa de EXECUTE para a policy avaliar.
-- 2) Fixa search_path nas funções flagadas pelo advisor (function_search_path_mutable).
-- 3) Restringe listagem do bucket público whatsapp_media (advisor 0025).
-- 4) Valida tenant_id nas RPCs de organização (defesa cross-tenant).

-- ── 1. Revogar EXECUTE de funções de trigger/internas ──────────────────────
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'enforce_profile_immutable_fields',
    'fn_lead_field_changed',
    'handle_lead_automation_on_insert',
    'handle_message_automation_on_insert',
    'handle_new_user',
    'rls_auto_enable',
    'update_inbox_templates_updated_at',
    'update_whatsapp_queue_updated_at',
    'update_automation_runs_updated_at',
    'update_last_inbound_at',
    'default_pipeline_column'
  ] LOOP
    PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn;
    IF FOUND THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        (SELECT p.oid::regprocedure FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = fn LIMIT 1)
      );
    END IF;
  END LOOP;
END $$;

-- ── 2. Fixar search_path nas funções flagadas pelo advisor ─────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'merge_leads_into', 'update_inbox_templates_updated_at',
        'normalize_name', 'default_pipeline_column',
        'handle_lead_automation_on_insert', 'update_whatsapp_queue_updated_at',
        'match_or_create_lead', 'fn_lead_field_changed',
        'cleanup_meta_oauth_sessions', 'normalize_phone',
        'get_window_remaining_seconds', 'update_last_inbound_at',
        'handle_message_automation_on_insert', 'find_trigger_node_id',
        'update_automation_runs_updated_at', 'is_within_24h_window',
        'normalize_email'
      )
      -- só altera quem ainda não tem search_path fixado
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO ''public''', r.sig);
  END LOOP;
END $$;

-- ── 3. Bucket whatsapp_media: remover listagem pública ─────────────────────
-- Bucket é público: objetos continuam acessíveis via URL pública
-- (/storage/v1/object/public/...). A policy broad de SELECT só servia para
-- list/download via API e permitia enumerar todos os arquivos.
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Authenticated can read whatsapp media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp_media');

-- ── 4. Validação de tenant nas RPCs de organização ─────────────────────────
-- owner_add_org_member: impede owner de anexar usuário de OUTRO tenant à org.
CREATE OR REPLACE FUNCTION public.owner_add_org_member(target_user_id uuid, target_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner_id uuid; _owner_client_id text; _target_org uuid;
        _owner_tenant uuid; _target_tenant uuid;
BEGIN
  SELECT owner_id INTO _owner_id FROM public.organizations WHERE id = target_org_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN RAISE EXCEPTION 'Only the organization owner can add members'; END IF;
  SELECT organization_id INTO _target_org FROM public.profiles WHERE id = target_user_id;
  IF _target_org IS NOT NULL THEN RAISE EXCEPTION 'User already belongs to an organization'; END IF;
  SELECT tenant_id INTO _owner_tenant FROM public.profiles WHERE id = _owner_id;
  SELECT tenant_id INTO _target_tenant FROM public.profiles WHERE id = target_user_id;
  IF _target_tenant IS NOT NULL AND _owner_tenant IS NOT NULL AND _target_tenant != _owner_tenant THEN
    RAISE EXCEPTION 'User belongs to a different tenant';
  END IF;
  SELECT client_id INTO _owner_client_id FROM public.profiles WHERE id = _owner_id;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = target_org_id, client_id = COALESCE(_owner_client_id, target_org_id::text), updated_at = now() WHERE id = target_user_id;
END;
$$;

-- supervisor_set_role: defesa extra — exige mesmo tenant além da mesma org.
CREATE OR REPLACE FUNCTION public.supervisor_set_role(target_user_id uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org_id uuid; _target_org_id uuid; _caller_role text;
        _caller_tenant uuid; _target_tenant uuid;
BEGIN
  SELECT role, organization_id, tenant_id INTO _caller_role, _caller_org_id, _caller_tenant FROM public.profiles WHERE id = auth.uid();
  IF _caller_role != 'supervisor' THEN RAISE EXCEPTION 'Only supervisors can use this function'; END IF;
  IF new_role = 'master' THEN RAISE EXCEPTION 'Supervisors cannot assign master role'; END IF;
  IF new_role NOT IN ('supervisor', 'atendente', 'vendedor') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT organization_id, tenant_id INTO _target_org_id, _target_tenant FROM public.profiles WHERE id = target_user_id;
  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN RAISE EXCEPTION 'You can only change roles for users in your organization'; END IF;
  IF _caller_tenant IS DISTINCT FROM _target_tenant THEN RAISE EXCEPTION 'You can only change roles for users in your tenant'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;
