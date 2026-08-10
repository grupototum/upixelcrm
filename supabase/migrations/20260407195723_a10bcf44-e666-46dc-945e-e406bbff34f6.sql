
CREATE OR REPLACE FUNCTION public.supervisor_set_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_org_id uuid;
  _target_org_id uuid;
  _caller_role text;
BEGIN
  -- Get caller info
  SELECT role, organization_id INTO _caller_role, _caller_org_id
  FROM public.profiles WHERE id = auth.uid();

  -- Must be supervisor
  IF _caller_role != 'supervisor' THEN
    RAISE EXCEPTION 'Only supervisors can use this function';
  END IF;

  -- Cannot set master role
  IF new_role = 'master' THEN
    RAISE EXCEPTION 'Supervisors cannot assign master role';
  END IF;

  -- Validate role
  IF new_role NOT IN ('supervisor', 'atendente', 'vendedor') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Get target org
  SELECT organization_id INTO _target_org_id
  FROM public.profiles WHERE id = target_user_id;

  -- Must be in the same org
  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN
    RAISE EXCEPTION 'You can only change roles for users in your organization';
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.supervisor_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_org_id uuid;
  _target_org_id uuid;
  _caller_role text;
BEGIN
  SELECT role, organization_id INTO _caller_role, _caller_org_id
  FROM public.profiles WHERE id = auth.uid();

  IF _caller_role NOT IN ('supervisor', 'master') THEN
    RAISE EXCEPTION 'Only supervisors can use this function';
  END IF;

  SELECT organization_id INTO _target_org_id
  FROM public.profiles WHERE id = target_user_id;

  IF _caller_org_id IS NULL OR _target_org_id IS NULL OR _caller_org_id != _target_org_id THEN
    RAISE EXCEPTION 'You can only block users in your organization';
  END IF;

  -- Cannot block yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;
