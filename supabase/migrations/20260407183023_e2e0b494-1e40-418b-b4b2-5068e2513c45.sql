
-- Function: admin can set role on any profile
CREATE OR REPLACE FUNCTION public.admin_set_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can change roles';
  END IF;
  UPDATE public.profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
END;
$$;

-- Function: admin can toggle block status
CREATE OR REPLACE FUNCTION public.admin_toggle_block(target_user_id uuid, block_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can block/unblock users';
  END IF;
  UPDATE public.profiles SET is_blocked = block_status, updated_at = now() WHERE id = target_user_id;
END;
$$;
