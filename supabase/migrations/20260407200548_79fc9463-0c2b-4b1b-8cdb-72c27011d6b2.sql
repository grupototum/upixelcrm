
-- Update trigger to check for bypass flag
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow migrations and service role
  IF current_setting('role') = 'rls_none' OR current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow admin/supervisor functions that set the bypass flag
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
  RETURN NEW;
END;
$$;

-- Update admin_set_role to set bypass flag
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can change roles'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update admin_toggle_block to set bypass flag
CREATE OR REPLACE FUNCTION public.admin_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can block/unblock users'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update admin_add_org_member to set bypass flag
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

-- Update admin_remove_org_member to set bypass flag
CREATE OR REPLACE FUNCTION public.admin_remove_org_member(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN RAISE EXCEPTION 'Only master users can manage org members'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = NULL, client_id = target_user_id::text, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update supervisor_set_role to set bypass flag
CREATE OR REPLACE FUNCTION public.supervisor_set_role(target_user_id uuid, new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org_id uuid; _target_org_id uuid; _caller_role text;
BEGIN
  SELECT role, organization_id INTO _caller_role, _caller_org_id FROM public.profiles WHERE id = auth.uid();
  IF _caller_role != 'supervisor' THEN RAISE EXCEPTION 'Only supervisors can use this function'; END IF;
  IF new_role = 'master' THEN RAISE EXCEPTION 'Supervisors cannot assign master role'; END IF;
  IF new_role NOT IN ('supervisor', 'atendente', 'vendedor') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT organization_id INTO _target_org_id FROM public.profiles WHERE id = target_user_id;
  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN RAISE EXCEPTION 'You can only change roles for users in your organization'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update supervisor_toggle_block to set bypass flag
CREATE OR REPLACE FUNCTION public.supervisor_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _caller_org_id uuid; _target_org_id uuid; _caller_role text;
BEGIN
  SELECT role, organization_id INTO _caller_role, _caller_org_id FROM public.profiles WHERE id = auth.uid();
  IF _caller_role NOT IN ('supervisor', 'master') THEN RAISE EXCEPTION 'Only supervisors can use this function'; END IF;
  SELECT organization_id INTO _target_org_id FROM public.profiles WHERE id = target_user_id;
  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN RAISE EXCEPTION 'You can only block users in your organization'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot block yourself'; END IF;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update owner_add_org_member to set bypass flag
CREATE OR REPLACE FUNCTION public.owner_add_org_member(target_user_id uuid, target_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner_id uuid; _owner_client_id text; _target_org uuid;
BEGIN
  SELECT owner_id INTO _owner_id FROM public.organizations WHERE id = target_org_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN RAISE EXCEPTION 'Only the organization owner can add members'; END IF;
  SELECT organization_id INTO _target_org FROM public.profiles WHERE id = target_user_id;
  IF _target_org IS NOT NULL THEN RAISE EXCEPTION 'User already belongs to an organization'; END IF;
  SELECT client_id INTO _owner_client_id FROM public.profiles WHERE id = _owner_id;
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles SET organization_id = target_org_id, client_id = COALESCE(_owner_client_id, target_org_id::text), updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Update owner_remove_org_member to set bypass flag
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
