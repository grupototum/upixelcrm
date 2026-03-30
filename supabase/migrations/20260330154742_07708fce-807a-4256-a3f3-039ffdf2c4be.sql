-- Modify the function to allow service role updates, then update
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow migrations and service role to update
  IF current_setting('role') = 'rls_none' OR current_setting('request.jwt.claims', true) IS NULL THEN
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