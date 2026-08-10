-- Fix handle_new_user to use 'c1' as default client_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, client_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'client_id', 'c1')
  );
  RETURN NEW;
END;
$$;

-- Also fix enforce_profile_immutable_fields: allow service_role to update
-- but block regular users from changing role/is_blocked/client_id
-- This is already fine as SECURITY DEFINER

-- Update default client_id on profiles table
ALTER TABLE public.profiles ALTER COLUMN client_id SET DEFAULT 'c1';