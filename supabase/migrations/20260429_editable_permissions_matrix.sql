-- Allow master users to edit the role_permissions matrix
-- so the UI permissions matrix becomes editable.

-- ── 1. Drop legacy read-only policies if present ────────────────
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Masters can manage role permissions" ON public.role_permissions;

-- ── 2. Recreate read policy (everyone authenticated can read) ────
CREATE POLICY "Authenticated can read role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- ── 3. Allow only master users to insert/update/delete ──────────
CREATE POLICY "Masters can insert role_permissions"
  ON public.role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_user());

CREATE POLICY "Masters can delete role_permissions"
  ON public.role_permissions FOR DELETE
  TO authenticated
  USING (public.is_master_user());

CREATE POLICY "Masters can update role_permissions"
  ON public.role_permissions FOR UPDATE
  TO authenticated
  USING (public.is_master_user())
  WITH CHECK (public.is_master_user());

-- ── 4. Seed any missing permissions (idempotent) ────────────────
-- Ensures the permissions used in the UI matrix exist in the DB
INSERT INTO public.role_permissions (role, permission) VALUES
  ('supervisor', 'lead.view_sensitive'),
  ('supervisor', 'lead.change_category'),
  ('vendedor',   'lead.change_category')
ON CONFLICT (role, permission) DO NOTHING;
