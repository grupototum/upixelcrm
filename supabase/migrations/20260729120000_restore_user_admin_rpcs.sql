-- Restaura RPCs de administração de usuários que sumiram/perderam grants em produção.
--
-- Sintomas: "permission denied for function admin_approve_user" ao aprovar usuário
-- como master, e "function not found" nas ações de mudar papel / bloquear /
-- gerenciar membros de organização.
--
-- Causa: admin_approve_user e admin_delete_user tiveram EXECUTE revogado de
-- authenticated (hardening que esqueceu de devolver o grant — as funções já se
-- protegem internamente com is_master_user()); admin_set_role, admin_toggle_block,
-- supervisor_toggle_block, admin_add_org_member, admin_remove_org_member e
-- owner_remove_org_member foram removidas fora de migration.
--
-- Definições recriadas a partir de 20260407200548 (com app.bypass_immutable),
-- com defesa de tenant em supervisor_toggle_block espelhando o hardening
-- aplicado a supervisor_set_role em 20260610120000.

-- ── Master: mudar papel ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can change roles'; END IF;
  IF new_role NOT IN ('master', 'supervisor', 'atendente', 'vendedor') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- ── Master: bloquear/desbloquear ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can block/unblock users'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- ── Supervisor: bloquear/desbloquear (mesma org e mesmo tenant) ─────────────
CREATE OR REPLACE FUNCTION public.supervisor_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org_id uuid; _target_org_id uuid; _caller_role text;
        _caller_tenant uuid; _target_tenant uuid;
BEGIN
  SELECT role, organization_id, tenant_id INTO _caller_role, _caller_org_id, _caller_tenant
  FROM public.profiles WHERE id = auth.uid();
  IF _caller_role NOT IN ('supervisor', 'master') THEN RAISE EXCEPTION 'Only supervisors can use this function'; END IF;
  SELECT organization_id, tenant_id INTO _target_org_id, _target_tenant
  FROM public.profiles WHERE id = target_user_id;
  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN
    RAISE EXCEPTION 'You can only block users in your organization';
  END IF;
  IF _caller_tenant IS DISTINCT FROM _target_tenant THEN
    RAISE EXCEPTION 'You can only block users in your tenant';
  END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- ── Master: gerenciar membros de organização ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_add_org_member(target_user_id uuid, target_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner_client_id text;
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can manage org members'; END IF;
  SELECT p.client_id INTO _owner_client_id FROM public.profiles p JOIN public.organizations o ON o.owner_id = p.id WHERE o.id = target_org_id;
  IF _owner_client_id IS NULL THEN _owner_client_id := target_org_id::text; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = target_org_id, client_id = _owner_client_id, updated_at = now() WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_org_member(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can manage org members'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = NULL, client_id = target_user_id::text, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- ── Owner: remover membro da própria organização ────────────────────────────
CREATE OR REPLACE FUNCTION public.owner_remove_org_member(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _org_id uuid; _owner_id uuid;
BEGIN
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = target_user_id;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'User is not in any organization'; END IF;
  SELECT owner_id INTO _owner_id FROM public.organizations WHERE id = _org_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN RAISE EXCEPTION 'Only the organization owner can remove members'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'Owner cannot remove themselves'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = NULL, client_id = target_user_id::text, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- ── Grants: anon nunca chama; authenticated precisa (checagem de papel é interna)
DO $$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.admin_approve_user(uuid)',
    'public.admin_delete_user(uuid)',
    'public.admin_set_role(uuid, text)',
    'public.admin_toggle_block(uuid, boolean)',
    'public.supervisor_toggle_block(uuid, boolean)',
    'public.admin_add_org_member(uuid, uuid)',
    'public.admin_remove_org_member(uuid)',
    'public.owner_remove_org_member(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', sig);
  END LOOP;
END $$;
