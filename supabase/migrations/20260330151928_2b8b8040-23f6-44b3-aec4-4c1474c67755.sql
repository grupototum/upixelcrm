
-- Fix 1: Prevent privilege escalation - restrict profile updates to safe fields only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_blocked = (SELECT is_blocked FROM public.profiles WHERE id = auth.uid())
    AND client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
  );

-- Fix 2: Allow same-client profile reads (for team visibility)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read profiles in their client"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (client_id = public.get_user_client_id());
