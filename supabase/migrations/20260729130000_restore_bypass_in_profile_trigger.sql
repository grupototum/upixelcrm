-- Continuação de 20260729120000_restore_user_admin_rpcs: o mesmo drift que
-- apagou as RPCs de administração também reverteu enforce_profile_immutable_fields
-- para a versão antiga, SEM a checagem de app.bypass_immutable (introduzida em
-- 20260407200548). Resultado: admin_set_role/admin_toggle_block etc. ativavam o
-- bypass, mas o gatilho ignorava e estourava "Cannot change role field directly".
--
-- Restaura a versão canônica de 20260407200548, sem alterações de comportamento.

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
