-- M15: Revoke rls_auto_enable() from anon/authenticated
-- This SECURITY DEFINER function was callable by anon via REST — dangerous.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
