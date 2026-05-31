-- M15: RPC wrapper para leitura de Vault secrets
-- Usado pela Edge Function check-signup-gate via service_role
-- anon e authenticated ficam sem EXECUTE

CREATE OR REPLACE FUNCTION public.read_secret(secret_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.read_secret(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.read_secret(text) FROM authenticated;
