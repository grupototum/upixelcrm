
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
BEGIN
  _client_id := NEW.id::text;

  -- Check if joining an existing organization
  IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
    _org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
    -- Get the owner's client_id to share data
    SELECT p.client_id INTO _client_id
    FROM public.profiles p
    JOIN public.organizations o ON o.owner_id = p.id
    WHERE o.id = _org_id;
    
    IF _client_id IS NULL THEN
      _client_id := NEW.id::text;
      _org_id := NULL;
    END IF;

  -- Check if creating a new organization
  ELSIF NEW.raw_user_meta_data->>'new_org_name' IS NOT NULL AND NEW.raw_user_meta_data->>'new_org_name' != '' THEN
    _org_slug := lower(regexp_replace(NEW.raw_user_meta_data->>'new_org_name', '[^a-zA-Z0-9]', '-', 'g'));
    _org_slug := _org_slug || '-' || substr(NEW.id::text, 1, 8);
    
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (NEW.raw_user_meta_data->>'new_org_name', _org_slug, NEW.id)
    RETURNING id INTO _org_id;
  ELSE
    _client_id := COALESCE(NEW.raw_user_meta_data->>'client_id', NEW.id::text);
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    _client_id,
    _org_id
  );
  RETURN NEW;
END;
$function$;
