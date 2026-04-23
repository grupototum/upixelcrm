-- Cria o tenant "Totum" e vincula todos os dados existentes (client_id='c1').
-- Owner: master@upixel.com.br (viniciuscarmooliveira@gmail.com também é master do c1)

DO $$
DECLARE
  v_tenant_id UUID;
  v_owner_id  UUID;
BEGIN
  -- Busca o owner (master@upixel.com.br) — ajuste se preferir outro usuário
  SELECT id INTO v_owner_id
  FROM public.profiles
  WHERE client_id = 'c1' AND role = 'master'
  ORDER BY created_at
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário master com client_id=c1 encontrado';
  END IF;

  -- Cria o tenant (idempotente: ignora se já existir)
  INSERT INTO public.tenants (name, subdomain, plan, owner_id, is_active)
  VALUES ('Totum', 'totum', 'free', v_owner_id, true)
  ON CONFLICT (subdomain) DO NOTHING
  RETURNING id INTO v_tenant_id;

  -- Se já existia, busca o ID
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE subdomain = 'totum';
  END IF;

  RAISE NOTICE 'Tenant Totum ID: %', v_tenant_id;

  -- ── Vincula todas as tabelas com client_id='c1' ─────────────────────────

  UPDATE public.profiles
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);
  RAISE NOTICE 'profiles atualizados: %', found;

  UPDATE public.leads
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.pipelines
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.pipeline_columns
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.conversations
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.messages
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.tasks
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.timeline_events
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.integrations
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.automations
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.automation_rules
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  UPDATE public.push_subscriptions
  SET tenant_id = v_tenant_id
  WHERE client_id = 'c1' AND (tenant_id IS NULL OR tenant_id <> v_tenant_id);

  RAISE NOTICE 'Tenant Totum configurado com sucesso. ID: %', v_tenant_id;
END;
$$;
