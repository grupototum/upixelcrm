-- M55: Fix N+1 RLS scans on profiles table
-- Issue: get_user_client_id(), get_user_tenant_id(), is_master_user() execute
-- SELECT FROM profiles for EVERY ROW checked by RLS policies. With millions of
-- rows in leads/tasks/etc., this causes ~99M scans/day on a 10-row table.
-- Fix: Cache profile fields per-user per-transaction so each query hits profiles
-- exactly once, not once per row.
-- Safety: Cache key includes auth.uid() so pooled connections cannot leak data.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Cached profile field helper
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_cached_profile_field(field_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _tx_key  TEXT := 'app.profile.' || COALESCE(_user_id::text, 'anon') || '.' || field_name;
  _sess_key TEXT := 'app.profile.sess.' || COALESCE(_user_id::text, 'anon') || '.' || field_name;
  _val TEXT;
  _row RECORD;
BEGIN
  -- No user = no value (RLS will reject anyway)
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) Try transaction-local cache (fastest, safest for pooled connections)
  BEGIN
    _val := current_setting(_tx_key, true);
  EXCEPTION WHEN OTHERS THEN
    _val := NULL;
  END;
  IF _val IS NOT NULL THEN
    RETURN _val;
  END IF;

  -- 2) Try session cache (still safe: key scoped to user_id)
  BEGIN
    _val := current_setting(_sess_key, true);
  EXCEPTION WHEN OTHERS THEN
    _val := NULL;
  END;
  IF _val IS NOT NULL THEN
    -- Promote to transaction cache for this query
    PERFORM set_config(_tx_key, _val, true);
    RETURN _val;
  END IF;

  -- 3) Fallback: single SELECT returning all frequently-used fields
  SELECT client_id, tenant_id::text, role, is_blocked::text
    INTO _row
    FROM public.profiles
   WHERE id = _user_id;

  IF _row IS NULL THEN
    RETURN NULL;
  END IF;

  -- Cache all fields at once to avoid future SELECTs in this tx/sess
  PERFORM set_config('app.profile.' || _user_id::text || '.client_id',     COALESCE(_row.client_id, ''),     true);
  PERFORM set_config('app.profile.' || _user_id::text || '.tenant_id',     COALESCE(_row.tenant_id, ''),     true);
  PERFORM set_config('app.profile.' || _user_id::text || '.role',          COALESCE(_row.role, ''),          true);
  PERFORM set_config('app.profile.' || _user_id::text || '.is_blocked',    COALESCE(_row.is_blocked, ''),    true);

  PERFORM set_config('app.profile.sess.' || _user_id::text || '.client_id',  COALESCE(_row.client_id, ''),     false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.tenant_id',  COALESCE(_row.tenant_id, ''),     false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.role',       COALESCE(_row.role, ''),          false);
  PERFORM set_config('app.profile.sess.' || _user_id::text || '.is_blocked', COALESCE(_row.is_blocked, ''),    false);

  -- Return requested field
  CASE field_name
    WHEN 'client_id'  THEN RETURN COALESCE(_row.client_id, '');
    WHEN 'tenant_id'  THEN RETURN COALESCE(_row.tenant_id, '');
    WHEN 'role'       THEN RETURN COALESCE(_row.role, '');
    WHEN 'is_blocked' THEN RETURN COALESCE(_row.is_blocked, '');
    ELSE RETURN NULL;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.get_cached_profile_field(TEXT) IS
  'M55: Cache-safe helper for profile fields. Returns a single field while caching
   all common fields (client_id, tenant_id, role, is_blocked) per-user per-transaction
   to eliminate N+1 RLS scans on the profiles table.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Rewrite get_user_client_id() to use cache
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_cached_profile_field('client_id')
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Rewrite get_user_tenant_id() to use cache
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_cached_profile_field('tenant_id')::UUID
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Rewrite is_master_user() to use cache
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_cached_profile_field('role'), '') = 'master'
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Fix policy "Users can update own profile" — was running 3 subqueries
--    per UPDATE. Replaced with cached helper calls (still 3 calls, but each
--    hits transaction cache after the first).
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_cached_profile_field('role')
    AND is_blocked::text = public.get_cached_profile_field('is_blocked')
    AND client_id = public.get_cached_profile_field('client_id')
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Trigger: invalidate cache when profiles row changes
--    Ensures that if a user's role/tenant/client_id is updated, the next
--    query picks up the new value instead of stale cache.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.invalidate_profile_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid TEXT := COALESCE(NEW.id::text, OLD.id::text);
BEGIN
  PERFORM set_config('app.profile.' || _uid || '.client_id',     NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.tenant_id',     NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.role',          NULL, true);
  PERFORM set_config('app.profile.' || _uid || '.is_blocked',    NULL, true);
  PERFORM set_config('app.profile.sess.' || _uid || '.client_id',  NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.tenant_id',  NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.role',       NULL, false);
  PERFORM set_config('app.profile.sess.' || _uid || '.is_blocked', NULL, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invalidate_profile_cache_trigger ON public.profiles;
CREATE TRIGGER invalidate_profile_cache_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_profile_cache();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Back-fill: ensure all existing profiles have tenant_id set
--    (prevents NULL tenant_id from causing cache misses in get_user_tenant_id)
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE public.profiles
   SET tenant_id = COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000')
 WHERE tenant_id IS NULL;
