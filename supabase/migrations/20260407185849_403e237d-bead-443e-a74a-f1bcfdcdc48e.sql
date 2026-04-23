
CREATE OR REPLACE FUNCTION public.owner_remove_org_member(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _owner_id uuid;
BEGIN
  -- Get the target's org
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = target_user_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User is not in any organization';
  END IF;

  -- Verify caller is the owner
  SELECT owner_id INTO _owner_id FROM public.organizations WHERE id = _org_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the organization owner can remove members';
  END IF;

  -- Cannot remove self (the owner)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Owner cannot remove themselves';
  END IF;

  UPDATE public.profiles
  SET organization_id = NULL,
      client_id = target_user_id::text,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_add_org_member(target_user_id uuid, target_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner_id uuid;
  _owner_client_id text;
  _target_org uuid;
BEGIN
  -- Verify caller is the owner of the target org
  SELECT owner_id INTO _owner_id FROM public.organizations WHERE id = target_org_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the organization owner can add members';
  END IF;

  -- Check target is not already in an org
  SELECT organization_id INTO _target_org FROM public.profiles WHERE id = target_user_id;
  IF _target_org IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Get owner's client_id
  SELECT client_id INTO _owner_client_id FROM public.profiles WHERE id = _owner_id;

  UPDATE public.profiles
  SET organization_id = target_org_id,
      client_id = COALESCE(_owner_client_id, target_org_id::text),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;
