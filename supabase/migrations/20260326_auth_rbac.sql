-- uPixel CRM — Auth & RBAC Migration
-- Run this in Supabase SQL Editor or via migration tool

-- ────────────────────────────────────────────────────────
-- 1. ENUM type for user roles
-- ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('supervisor', 'atendente', 'vendedor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ────────────────────────────────────────────────────────
-- 2. Users table (extends Supabase auth)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 3. Permissions table (maps role → permission)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

-- ────────────────────────────────────────────────────────
-- 4. Seed default permissions
-- ────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  -- Supervisor: full access
  ('supervisor', 'crm.view'), ('supervisor', 'crm.edit'), ('supervisor', 'crm.delete'),
  ('supervisor', 'crm.export'), ('supervisor', 'crm.transfer'),
  ('supervisor', 'inbox.view'), ('supervisor', 'inbox.reply'),
  ('supervisor', 'tasks.view'), ('supervisor', 'tasks.create'), ('supervisor', 'tasks.delete'),
  ('supervisor', 'automations.view'), ('supervisor', 'automations.edit'),
  ('supervisor', 'reports.view'), ('supervisor', 'users.view'), ('supervisor', 'users.manage'),
  ('supervisor', 'intelligence.view'), ('supervisor', 'settings.view'),
  -- Atendente: inbox + tasks + view CRM
  ('atendente', 'crm.view'),
  ('atendente', 'inbox.view'), ('atendente', 'inbox.reply'),
  ('atendente', 'tasks.view'), ('atendente', 'tasks.create'),
  -- Vendedor: CRM + tasks + intelligence
  ('vendedor', 'crm.view'), ('vendedor', 'crm.edit'), ('vendedor', 'crm.export'),
  ('vendedor', 'inbox.view'),
  ('vendedor', 'tasks.view'), ('vendedor', 'tasks.create'),
  ('vendedor', 'intelligence.view')
ON CONFLICT (role, permission) DO NOTHING;

-- ────────────────────────────────────────────────────────
-- 5. Audit log table
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 6. RLS policies
-- ────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own profile, supervisors can read all
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Supervisors can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

-- Permissions: readable by all authenticated
CREATE POLICY "Authenticated can read permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Audit: only supervisors
CREATE POLICY "Supervisors can read audit log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

CREATE POLICY "System can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────
-- 7. Auto-create profile on signup trigger
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
