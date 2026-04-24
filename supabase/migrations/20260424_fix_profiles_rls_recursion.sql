-- Fix: infinite recursion in profiles RLS + master profile bootstrap
--
-- The "Supervisors can manage tenant profiles" policy had a direct subquery
-- against public.profiles inside itself, causing infinite recursion → HTTP 500.
-- Fix: extract the role lookup into a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Supervisors can manage tenant profiles" ON public.profiles;

CREATE POLICY "Supervisors can manage tenant profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (
    id = auth.uid()
    OR public.is_master_user()
    OR (
      public.get_user_role() = 'supervisor'
      AND (
        tenant_id = public.get_user_tenant_id()
        OR (tenant_id IS NULL AND public.get_user_tenant_id() IS NULL)
      )
    )
  );
