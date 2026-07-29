-- handle_new_user nunca preenchia profiles.tenant_id, e o login por subdomínio
-- exige tenant_id = tenant do subdomínio — todo usuário criado por admin ficava
-- sem acesso. Agora deriva tenant_id do client_id quando este é um tenant real.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _client_id text;
  _org_id uuid;
  _org_slug text;
  _role text;
  _approval text;
  _tenant_id uuid;
BEGIN
  _client_id := NEW.id::text;
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor');
  IF _role = 'master' THEN _approval := 'approved'; ELSE _approval := 'pending'; END IF;

  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
    _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    SELECT p.client_id INTO _client_id FROM public.profiles p
    JOIN public.organizations o ON o.owner_id = p.id WHERE o.id = _org_id;
    IF _client_id IS NULL THEN _client_id := NEW.id::text; _org_id := NULL; END IF;
  ELSIF NEW.raw_user_meta_data->>'new_org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'new_org_name' != '' THEN
    _org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'new_org_name', '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (NEW.raw_user_meta_data->>'new_org_name', _org_slug, NEW.id) RETURNING id INTO _org_id;
  ELSE
    _client_id := COALESCE(NEW.raw_user_meta_data->>'client_id', NEW.id::text);
  END IF;

  -- tenant_id: derivado do client_id quando este referencia um tenant real
  -- (membros herdam o tenant do workspace); senão fica NULL (conta standalone).
  SELECT t.id INTO _tenant_id FROM public.tenants t WHERE t.id::text = _client_id;

  INSERT INTO public.profiles (id, name, email, role, client_id, organization_id, approval_status, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, _role, _client_id, _org_id, _approval, _tenant_id);
  RETURN NEW;
END;
$function$;
