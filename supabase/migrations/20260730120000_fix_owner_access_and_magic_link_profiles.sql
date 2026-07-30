-- Fix: dona de tenant criada via /cadastro ficava sem acesso ao próprio CRM.
--
-- Causas encadeadas:
-- 1) handle_new_user (reescrito em 20260428_user_approval_system) parou de ler
--    raw_user_meta_data->>'tenant_id' — que o SignupPage envia desde 20260422.
--    O profile do dono nascia com tenant_id NULL e client_id = próprio user id,
--    reprovando na checagem de subdomínio do AuthContext ("não pertence a esta
--    empresa"). O patch 20260729224830 só derivou tenant de metadata 'client_id',
--    que o SignupPage não envia.
-- 2) Todo não-master nasce approval_status='pending' e apenas master aprova —
--    inclusive o dono do tenant recém-criado, que fica em deadlock (não há
--    ninguém no workspace para aprová-lo).
-- 3) O backfill do M55 gravou tenant_id = zero-uuid em perfis antigos, quebrando
--    o fallback legado (!tenant_id && client_id = tenant.id) do login.
--
-- Estratégia: metadata continua NÃO concedendo acesso (evita takeover de tenant
-- por signUp com metadata forjado) — apenas vincula. A aprovação do dono passa a
-- acontecer server-side no momento do claim do tenant (UPDATE owner_id NULL→user,
-- permitido pela policy "Authenticated can claim unowned tenant"), que é um evento
-- que só o fluxo legítimo de signup produz.

-- ── 1. handle_new_user: volta a honrar tenant_id do metadata (só vínculo) ──
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
  _meta_tenant uuid;
BEGIN
  _client_id := NEW.id::text;
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor');
  IF _role = 'master' THEN _approval := 'approved'; ELSE _approval := 'pending'; END IF;

  BEGIN
    _meta_tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    _meta_tenant := NULL;
  END;

  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
    _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    SELECT p.client_id INTO _client_id FROM public.profiles p
    JOIN public.organizations o ON o.owner_id = p.id WHERE o.id = _org_id;
    IF _client_id IS NULL THEN _client_id := NEW.id::text; _org_id := NULL; END IF;
  ELSIF NEW.raw_user_meta_data->>'new_org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'new_org_name' != '' THEN
    _org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'new_org_name', '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (NEW.raw_user_meta_data->>'new_org_name', _org_slug, NEW.id) RETURNING id INTO _org_id;
  ELSIF _meta_tenant IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _meta_tenant) THEN
    _tenant_id := _meta_tenant;
    _client_id := _meta_tenant::text;
  ELSE
    _client_id := COALESCE(NEW.raw_user_meta_data->>'client_id', NEW.id::text);
  END IF;

  IF _tenant_id IS NULL THEN
    SELECT t.id INTO _tenant_id FROM public.tenants t WHERE t.id::text = _client_id;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, organization_id, approval_status, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, _role, _client_id, _org_id, _approval, _tenant_id);
  RETURN NEW;
END;
$function$;

-- ── 2. Claim do tenant (owner_id NULL → user) aprova e vincula o dono ──
CREATE OR REPLACE FUNCTION public.handle_tenant_owner_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles
     SET tenant_id = NEW.id,
         client_id = NEW.id::text,
         approval_status = 'approved',
         updated_at = now()
   WHERE id = NEW.owner_id;
  PERFORM set_config('app.bypass_immutable', 'false', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_owner_claimed ON public.tenants;
CREATE TRIGGER on_tenant_owner_claimed
  AFTER UPDATE OF owner_id ON public.tenants
  FOR EACH ROW
  WHEN (OLD.owner_id IS NULL AND NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_tenant_owner_claimed();

-- ── 3. Claim da organization vincula organization_id no profile do dono ──
CREATE OR REPLACE FUNCTION public.handle_org_owner_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
     SET organization_id = NEW.id,
         updated_at = now()
   WHERE id = NEW.owner_id
     AND (organization_id IS NULL OR organization_id IS DISTINCT FROM NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_owner_claimed ON public.organizations;
CREATE TRIGGER on_org_owner_claimed
  AFTER UPDATE OF owner_id ON public.organizations
  FOR EACH ROW
  WHEN (OLD.owner_id IS NULL AND NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_org_owner_claimed();

-- ── 4. Backfill: repara donos e membros já presos fora do próprio workspace ──
-- (rodando como migração, enforce_profile_immutable_fields libera via
-- request.jwt.claims NULL)
UPDATE public.profiles p
   SET tenant_id = t.tenant_id,
       client_id = t.tenant_id::text,
       approval_status = 'approved',
       updated_at = now()
  FROM (
    SELECT DISTINCT ON (owner_id) owner_id, id AS tenant_id
      FROM public.tenants
     WHERE owner_id IS NOT NULL
     ORDER BY owner_id, created_at
  ) t
 WHERE t.owner_id = p.id
   AND p.role <> 'master'
   AND (p.tenant_id IS DISTINCT FROM t.tenant_id
        OR p.client_id <> t.tenant_id::text
        OR p.approval_status <> 'approved');

UPDATE public.profiles p
   SET organization_id = o.org_id,
       updated_at = now()
  FROM (
    SELECT DISTINCT ON (owner_id) owner_id, id AS org_id
      FROM public.organizations
     WHERE owner_id IS NOT NULL
     ORDER BY owner_id, created_at
  ) o
 WHERE o.owner_id = p.id
   AND p.organization_id IS NULL;

-- Membros cujo client_id referencia um tenant real mas tenant_id ficou
-- NULL (trigger antigo) ou zero-uuid (backfill do M55).
UPDATE public.profiles p
   SET tenant_id = t.id,
       updated_at = now()
  FROM public.tenants t
 WHERE t.id::text = p.client_id
   AND (p.tenant_id IS NULL OR p.tenant_id = '00000000-0000-0000-0000-000000000000');

-- ── 5. RPC de primeiro acesso via Magic Link ──
-- Cria o profile mínimo se o trigger não tiver criado (usuários pré-trigger).
-- Papel mínimo ('atendente') e pending — acesso real continua dependendo de
-- aprovação, nada de auto-elevação.
CREATE OR REPLACE FUNCTION public.ensure_own_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
    RETURN;
  END IF;
  SELECT u.email, COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    INTO _email, _name
    FROM auth.users u WHERE u.id = _uid;
  INSERT INTO public.profiles (id, name, email, role, client_id, approval_status)
  VALUES (_uid, COALESCE(_name, ''), COALESCE(_email, ''), 'atendente', _uid::text, 'pending')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_own_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile() TO authenticated;
