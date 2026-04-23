
CREATE OR REPLACE FUNCTION public.admin_add_org_member(target_user_id uuid, target_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner_client_id text;
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can manage org members';
  END IF;
  
  -- Get the org owner's client_id
  SELECT p.client_id INTO _owner_client_id
  FROM public.profiles p
  JOIN public.organizations o ON o.owner_id = p.id
  WHERE o.id = target_org_id;
  
  IF _owner_client_id IS NULL THEN
    -- Org has no owner or doesn't exist, use org id as client_id
    _owner_client_id := target_org_id::text;
  END IF;
  
  UPDATE public.profiles
  SET organization_id = target_org_id,
      client_id = _owner_client_id,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_org_member(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can manage org members';
  END IF;
  
  UPDATE public.profiles
  SET organization_id = NULL,
      client_id = target_user_id::text,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;
