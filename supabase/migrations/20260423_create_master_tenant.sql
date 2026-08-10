-- Cria o tenant "Master" (subdomínio master.upixel.app) para testes gerais.
-- Owner: master@upixel.com.br
-- Usuários vinculados: test@upixel.com, demo@upixel.com.br, admin@upixel.com.br, teste@teste.com

DO $$
DECLARE
  v_tenant_id UUID;
  v_owner_id  UUID;
BEGIN
  -- Busca o owner pelo e-mail
  SELECT p.id INTO v_owner_id
  FROM public.profiles p
  WHERE p.email = 'master@upixel.com.br'
  LIMIT 1;

  -- Fallback: qualquer usuário com role master que ainda não tem tenant
  IF v_owner_id IS NULL THEN
    SELECT p.id INTO v_owner_id
    FROM public.profiles p
    WHERE p.role = 'master' AND p.tenant_id IS NULL
    LIMIT 1;
  END IF;

  -- Cria o tenant (idempotente)
  INSERT INTO public.tenants (name, subdomain, plan, owner_id, is_active)
  VALUES ('Master', 'master', 'free', v_owner_id, true)
  ON CONFLICT (subdomain) DO NOTHING
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE subdomain = 'master';
  END IF;

  RAISE NOTICE 'Tenant Master ID: %', v_tenant_id;

  -- Vincula os usuários de teste ao tenant master
  UPDATE public.profiles
  SET tenant_id = v_tenant_id,
      client_id = v_tenant_id::text
  WHERE email IN (
    'master@upixel.com.br',
    'test@upixel.com',
    'demo@upixel.com.br',
    'admin@upixel.com.br',
    'teste@teste.com'
  )
  AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  RAISE NOTICE 'Tenant Master configurado. ID: %', v_tenant_id;
END;
$$;
