-- Permitir que usuários não autenticados criem tenants no fluxo de self-service signup.
-- A LandingPage cria o tenant ANTES do signUp (e atribui owner_id depois), então
-- o insert precisa ser permitido para role 'anon'.

DROP POLICY IF EXISTS "Authenticated can insert tenant" ON public.tenants;

CREATE POLICY "Anyone can insert tenant (self-service signup)"
  ON public.tenants FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Também é necessário permitir que a operação "UPDATE owner_id após signUp" funcione.
-- A policy "Owner can update tenant" existente exige owner_id = auth.uid(), mas
-- no momento do UPDATE inicial (logo após signUp), owner_id ainda é NULL.
-- Adicionamos uma policy permitindo que usuários autenticados claimem tenants sem owner.

DROP POLICY IF EXISTS "Authenticated can claim unowned tenant" ON public.tenants;

CREATE POLICY "Authenticated can claim unowned tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id IS NULL)
  WITH CHECK (owner_id = auth.uid());
