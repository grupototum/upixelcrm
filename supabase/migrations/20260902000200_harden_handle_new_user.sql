-- ============================================================================
-- 20260902000200_harden_handle_new_user.sql
-- Auditoria de segurança 2026-09-01 — item 2: handle_new_user não confia mais
-- em raw_user_meta_data para role/aprovação.
--
-- PROBLEMA
--   handle_new_user lia `role` de raw_user_meta_data (editável pelo próprio
--   usuário via supabase.auth.signUp/updateUser). Bastava signUp com
--   {role:'master'} para nascer master APROVADO.
--
-- DECISÕES
--   * role/approval_status/tenant_id confiáveis vêm SÓ de raw_app_meta_data
--     (só service role escreve). supabase/functions/admin-create-user passa a
--     enviar app_metadata {role, approval_status:'approved', tenant_id}.
--     Sem app_metadata: role='vendedor', approval_status='pending'. Sempre.
--   * tenant_id / organization_id de raw_user_meta_data só VINCULAM (pending);
--     nunca aprovam. `client_id` de metadata deixou de ser lido (nenhum caller
--     no repo envia; permitia apontar o profile para o client de outro tenant).
--   * Dono de tenant (SignupPage): o fluxo foi reordenado (signUp → INSERT em
--     tenants/organizations já com owner_id = auth.uid()). A promoção a
--     supervisor aprovado acontece server-side no trigger
--     handle_tenant_owner_claimed, que agora dispara também em INSERT com
--     owner_id (antes só em UPDATE NULL→uid, o "claim", cuja policy foi
--     removida em 20260902000100). Guarda: só promove quando
--     NEW.owner_id = auth.uid() (ou sem JWT: migração/service role) — impede
--     um usuário inserir tenant com owner_id de terceiro e sequestrar o
--     profile dele.
--   * handle_tenant_owner_claimed / handle_org_owner_claimed existem no repo
--     em 20260730120000, que NÃO está aplicada em prod (schema_migrations
--     pula de 20260729224813 para 20260811004344). Recriadas aqui de forma
--     idempotente para o caminho não depender daquela migration.
--   * handle_org_owner_claimed passa a setar app.bypass_immutable — sem isso
--     o enforce_profile_immutable_fields novo (20260902000100) bloquearia o
--     UPDATE de organization_id feito pelo trigger.
--
-- ORDEM DE APLICAÇÃO (gate humano)
--   1) 20260902000100  2) esta migration  3) deploy do frontend + da edge
--   admin-create-user. Entre (2) e (3) um signup pelo frontend antigo falha
--   com erro de RLS e faz rollback (sem tenant órfão) — aceitável.
--
-- ROLLBACK
--   * handle_new_user: reaplicar o corpo de 20260729224813_fix_handle_new_user
--     (versão hoje em prod, lê role de raw_user_meta_data).
--   * DROP TRIGGER on_tenant_owner_set ON tenants; DROP TRIGGER on_org_owner_set
--     ON organizations; (os triggers on_*_owner_claimed de 20260730 podem ser
--     recriados a partir daquele arquivo).
--   * A edge admin-create-user continua funcionando com o handle_new_user
--     antigo (ele ignora app_metadata e o pós-update via service role corrige
--     approval/tenant) — role, porém, voltaria a vir de user_metadata, então
--     restaure também o `role` em user_metadata na edge.
-- ============================================================================

-- ── 1. handle_new_user ─────────────────────────────────────────────────────
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
  _app_tenant uuid;
BEGIN
  _client_id := NEW.id::text;

  -- Canal confiável: raw_app_meta_data (só service role escreve).
  -- raw_user_meta_data (editável pelo usuário) NUNCA define role/aprovação.
  _role := NEW.raw_app_meta_data->>'role';
  IF _role IS NULL OR _role NOT IN ('master','supervisor','atendente','vendedor') THEN
    _role := 'vendedor';
  END IF;
  IF NEW.raw_app_meta_data->>'approval_status' = 'approved' THEN
    _approval := 'approved';
  ELSE
    _approval := 'pending';
  END IF;

  BEGIN
    _app_tenant := NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    _app_tenant := NULL;
  END;
  BEGIN
    _meta_tenant := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    _meta_tenant := NULL;
  END;

  IF _app_tenant IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _app_tenant) THEN
    -- admin-create-user: herda o tenant do master criador.
    _tenant_id := _app_tenant;
    _client_id := _app_tenant::text;
    IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
      _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    END IF;
  ELSIF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
    -- Só vincula (fica pending): membro herda client do dono da organização.
    _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    SELECT p.client_id INTO _client_id FROM public.profiles p
    JOIN public.organizations o ON o.owner_id = p.id WHERE o.id = _org_id;
    IF _client_id IS NULL THEN _client_id := NEW.id::text; _org_id := NULL; END IF;
  ELSIF NEW.raw_user_meta_data->>'new_org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'new_org_name' != '' THEN
    _org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'new_org_name', '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (NEW.raw_user_meta_data->>'new_org_name', _org_slug, NEW.id) RETURNING id INTO _org_id;
  ELSIF _meta_tenant IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = _meta_tenant) THEN
    -- Só vincula (fica pending); acesso depende de aprovação no tenant.
    _tenant_id := _meta_tenant;
    _client_id := _meta_tenant::text;
  END IF;

  -- tenant_id derivado do client_id quando este referencia um tenant real.
  IF _tenant_id IS NULL THEN
    SELECT t.id INTO _tenant_id FROM public.tenants t WHERE t.id::text = _client_id;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, organization_id, approval_status, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, _role, _client_id, _org_id, _approval, _tenant_id);
  RETURN NEW;
END;
$function$;

-- ── 2. Dono de tenant → supervisor aprovado no próprio tenant ──────────────
CREATE OR REPLACE FUNCTION public.handle_tenant_owner_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só o próprio usuário (ou contexto sem JWT: migração/service role) pode
  -- se tornar dono. Impede INSERT de tenant com owner_id de terceiro.
  IF auth.uid() IS NOT NULL AND NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles
     SET tenant_id = NEW.id,
         client_id = NEW.id::text,
         approval_status = 'approved',
         role = CASE WHEN role = 'master' THEN role ELSE 'supervisor' END,
         updated_at = now()
   WHERE id = NEW.owner_id;
  PERFORM set_config('app.bypass_immutable', 'false', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_owner_claimed ON public.tenants;
DROP TRIGGER IF EXISTS on_tenant_owner_set ON public.tenants;
CREATE TRIGGER on_tenant_owner_set
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  WHEN (NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_tenant_owner_claimed();

DROP TRIGGER IF EXISTS on_tenant_owner_claimed_update ON public.tenants;
CREATE TRIGGER on_tenant_owner_claimed_update
  AFTER UPDATE OF owner_id ON public.tenants
  FOR EACH ROW
  WHEN (OLD.owner_id IS NULL AND NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_tenant_owner_claimed();

-- ── 3. Dono de organização → organization_id no próprio profile ────────────
CREATE OR REPLACE FUNCTION public.handle_org_owner_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.bypass_immutable', 'true', true);
  UPDATE public.profiles
     SET organization_id = NEW.id,
         updated_at = now()
   WHERE id = NEW.owner_id
     AND organization_id IS DISTINCT FROM NEW.id;
  PERFORM set_config('app.bypass_immutable', 'false', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_owner_claimed ON public.organizations;
DROP TRIGGER IF EXISTS on_org_owner_set ON public.organizations;
CREATE TRIGGER on_org_owner_set
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  WHEN (NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_org_owner_claimed();

DROP TRIGGER IF EXISTS on_org_owner_claimed_update ON public.organizations;
CREATE TRIGGER on_org_owner_claimed_update
  AFTER UPDATE OF owner_id ON public.organizations
  FOR EACH ROW
  WHEN (OLD.owner_id IS NULL AND NEW.owner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_org_owner_claimed();
