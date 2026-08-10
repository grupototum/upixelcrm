-- Permite que o fluxo de signup público crie organizations antes do auth.signUp.
-- Mesma estratégia já aplicada para tenants em 20260423_allow_anon_tenant_insert.sql.
--
-- Sem isso o INSERT em organizations falha com:
--   "new row violates row-level security policy for table organizations"
-- E o rollback do tenant também falha (anon sem DELETE), deixando tenant órfão
-- que causa "duplicate key value violates unique constraint tenants_subdomain_key"
-- em tentativas seguintes.

CREATE POLICY "Anyone can insert organization (self-service signup)"
  ON public.organizations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Permite que usuário autenticado claime organization sem owner (logo após signUp).
CREATE POLICY "Authenticated can claim unowned organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (owner_id IS NULL)
  WITH CHECK (owner_id = auth.uid());

-- Permite que anon delete organization sem owner (rollback durante signup falho).
CREATE POLICY "Anon can delete unowned organization (signup rollback)"
  ON public.organizations FOR DELETE
  TO anon, authenticated
  USING (owner_id IS NULL);

-- Mesmo fix para tenants: permite delete de tenant sem owner para rollback.
CREATE POLICY "Anon can delete unowned tenant (signup rollback)"
  ON public.tenants FOR DELETE
  TO anon, authenticated
  USING (owner_id IS NULL);
