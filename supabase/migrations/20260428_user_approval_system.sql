-- Sistema de aprovação de usuários por master
-- Substitui a confirmação de email do Supabase por aprovação manual no painel

-- Coluna approval_status em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Todos profiles existentes ficam aprovados (não quebra usuários atuais)
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';

-- Modificar handle_new_user para criar como pending (exceto masters)
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
BEGIN
  _client_id := NEW.id::text;
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor');

  -- Masters criados via SQL/seeds entram já aprovados
  IF _role = 'master' THEN
    _approval := 'approved';
  ELSE
    _approval := 'pending';
  END IF;

  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
    _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    SELECT p.client_id INTO _client_id
    FROM public.profiles p
    JOIN public.organizations o ON o.owner_id = p.id
    WHERE o.id = _org_id;

    IF _client_id IS NULL THEN
      _client_id := NEW.id::text;
      _org_id := NULL;
    END IF;

  ELSIF NEW.raw_user_meta_data->>'new_org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'new_org_name' != '' THEN
    _org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'new_org_name', '[^a-zA-Z0-9]', '-', 'g'));
    _org_slug := _org_slug || '-' || substr(NEW.id::text, 1, 8);

    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (NEW.raw_user_meta_data->>'new_org_name', _org_slug, NEW.id)
    RETURNING id INTO _org_id;
  ELSE
    _client_id := COALESCE(NEW.raw_user_meta_data->>'client_id', NEW.id::text);
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, organization_id, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    _role,
    _client_id,
    _org_id,
    _approval
  );
  RETURN NEW;
END;
$function$;

-- RPC para master aprovar usuário
CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_master_user() THEN
    RAISE EXCEPTION 'Only master users can approve users';
  END IF;

  UPDATE public.profiles
  SET approval_status = 'approved', updated_at = now()
  WHERE id = target_user_id;
END;
$$;
