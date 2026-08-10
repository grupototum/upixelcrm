-- Permite master deletar usuário permanentemente
-- Deleta profile (cascata para dados relacionados) e desabilita auth user

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can delete users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own user account';
  END IF;

  -- Desabilitar o auth user (não conseguimos deletar direto do client)
  UPDATE auth.users SET
    email = 'deleted_' || target_user_id::text || '_@deleted.local',
    raw_user_meta_data = '{"deleted_at": "' || NOW()::text || '"}'::jsonb
  WHERE id = target_user_id;

  -- Deletar profile (cascata automática para dados relacionados)
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;
