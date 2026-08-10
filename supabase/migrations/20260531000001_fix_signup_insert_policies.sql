-- M15: Restrict INSERT on tenants/organizations — require authenticated user
-- Before: WITH CHECK (true) for anon+authenticated (anyone could create tenant)
-- After: only authenticated users (auth.uid() IS NOT NULL)

DROP POLICY IF EXISTS "Anyone can insert tenant (self-service signup)" ON public.tenants;
CREATE POLICY "Authenticated users can insert tenant (self-service signup)"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert organization (self-service signup)" ON public.organizations;
CREATE POLICY "Authenticated users can insert organization (self-service signup)"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
