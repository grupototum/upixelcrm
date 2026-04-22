-- ============================================================
-- BUNDLE COMPLETO DE MIGRATIONS — uPixel CRM
-- Gerado em 2026-04-22T23:39:47Z
-- Cole tudo no SQL Editor do projeto NOVO e execute
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- File: 20260324225441_d3720190-ada1-4464-92e9-53076ea82ca2.sql
-- ────────────────────────────────────────────────────────────

-- Create pipeline_columns table
CREATE TABLE IF NOT EXISTS public.pipeline_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id TEXT NOT NULL DEFAULT 'p1',
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "Allow all access to pipeline_columns" ON public.pipeline_columns FOR ALL USING (true) WITH CHECK (true);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  "position" TEXT,
  city TEXT,
  notes TEXT,
  origin TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  column_id UUID REFERENCES public.pipeline_columns(id) ON DELETE SET NULL,
  responsible_id TEXT,
  value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  due_date DATE,
  assigned_to TEXT DEFAULT 'Você',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Create timeline_events table
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'stage_change', 'note', 'task', 'automation', 'call')),
  content TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to timeline_events" ON public.timeline_events;
CREATE POLICY "Allow all access to timeline_events" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_column_id ON public.leads(column_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_lead_id ON public.timeline_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_columns_order ON public.pipeline_columns("order");


-- ────────────────────────────────────────────────────────────
-- File: 20260326_auth_rbac.sql
-- ────────────────────────────────────────────────────────────
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
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Supervisors can manage all profiles" ON public.profiles;
CREATE POLICY "Supervisors can manage all profiles" ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

-- Permissions: readable by all authenticated
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can read permissions" ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Audit: only supervisors
DROP POLICY IF EXISTS "Supervisors can read audit log" ON public.audit_log;
CREATE POLICY "Supervisors can read audit log" ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT
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
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- File: 20260327210805_b5a6836f-1778-46ab-9308-097ce17210fe.sql
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL DEFAULT 'c1',
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  trigger_type text,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to automations" ON public.automations;
CREATE POLICY "Allow all access to automations" ON public.automations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- File: 20260327_integrations.sql
-- ────────────────────────────────────────────────────────────
-- uPixel CRM — API Keys & Webhooks Migration

-- ────────────────────────────────────────────────────────
-- 1. API Keys table
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  token_preview TEXT NOT NULL,
  token_hash TEXT NOT NULL, -- hashed secret for security
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 2. Webhook Endpoints table
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  url TEXT NOT NULL,
  description TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL, -- used to sign the payload
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 3. Webhook Delivery Logs (Optional, for audit)
-- ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────
-- 4. RLS policies
-- ────────────────────────────────────────────────────────
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- API Keys: Only supervisors can view/manage
DROP POLICY IF EXISTS "Supervisors can manage API keys" ON public.api_keys;
CREATE POLICY "Supervisors can manage API keys" ON public.api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

-- Webhook Endpoints: Only supervisors can view/manage
DROP POLICY IF EXISTS "Supervisors can manage webhooks" ON public.webhook_endpoints;
CREATE POLICY "Supervisors can manage webhooks" ON public.webhook_endpoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );

-- Webhook Deliveries: Only supervisors can view
DROP POLICY IF EXISTS "Supervisors can view webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Supervisors can view webhook deliveries" ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'supervisor'
    )
  );


-- ────────────────────────────────────────────────────────────
-- File: 20260330151739_ac58e4ef-ac84-4034-90b9-0be200f136d6.sql
-- ────────────────────────────────────────────────────────────

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Helper function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 3. Drop all permissive policies
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all access to automations" ON public.automations;
DROP POLICY IF EXISTS "Allow all access to pipeline_columns" ON public.pipeline_columns;
DROP POLICY IF EXISTS "Allow all access to timeline_events" ON public.timeline_events;

-- 4. Leads policies
DROP POLICY IF EXISTS "Users can view leads in their client" ON public.leads;
CREATE POLICY "Users can view leads in their client" ON public.leads FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert leads in their client" ON public.leads;
CREATE POLICY "Users can insert leads in their client" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update leads in their client" ON public.leads;
CREATE POLICY "Users can update leads in their client" ON public.leads FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete leads in their client" ON public.leads;
CREATE POLICY "Users can delete leads in their client" ON public.leads FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 5. Tasks policies
DROP POLICY IF EXISTS "Users can view tasks in their client" ON public.tasks;
CREATE POLICY "Users can view tasks in their client" ON public.tasks FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert tasks in their client" ON public.tasks;
CREATE POLICY "Users can insert tasks in their client" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update tasks in their client" ON public.tasks;
CREATE POLICY "Users can update tasks in their client" ON public.tasks FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete tasks in their client" ON public.tasks;
CREATE POLICY "Users can delete tasks in their client" ON public.tasks FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 6. Automations policies
DROP POLICY IF EXISTS "Users can view automations in their client" ON public.automations;
CREATE POLICY "Users can view automations in their client" ON public.automations FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert automations in their client" ON public.automations;
CREATE POLICY "Users can insert automations in their client" ON public.automations FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update automations in their client" ON public.automations;
CREATE POLICY "Users can update automations in their client" ON public.automations FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete automations in their client" ON public.automations;
CREATE POLICY "Users can delete automations in their client" ON public.automations FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 7. Pipeline columns policies
DROP POLICY IF EXISTS "Users can view pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can view pipeline_columns in their client" ON public.pipeline_columns FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can insert pipeline_columns in their client" ON public.pipeline_columns FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can update pipeline_columns in their client" ON public.pipeline_columns FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can delete pipeline_columns in their client" ON public.pipeline_columns FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 8. Timeline events - join through leads for client_id scoping
DROP POLICY IF EXISTS "Users can view timeline_events for their leads" ON public.timeline_events;
CREATE POLICY "Users can view timeline_events for their leads" ON public.timeline_events FOR SELECT TO authenticated
  USING (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

DROP POLICY IF EXISTS "Users can insert timeline_events for their leads" ON public.timeline_events;
CREATE POLICY "Users can insert timeline_events for their leads" ON public.timeline_events FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

DROP POLICY IF EXISTS "Users can delete timeline_events for their leads" ON public.timeline_events;
CREATE POLICY "Users can delete timeline_events for their leads" ON public.timeline_events FOR DELETE TO authenticated
  USING (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

-- 9. Add updated_at trigger to profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- File: 20260330151928_2b8b8040-23f6-44b3-aec4-4c1474c67755.sql
-- ────────────────────────────────────────────────────────────

-- Fix 1: Prevent privilege escalation - restrict profile updates to safe fields only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
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

DROP POLICY IF EXISTS "Users can read profiles in their client" ON public.profiles;
CREATE POLICY "Users can read profiles in their client" ON public.profiles FOR SELECT
  TO authenticated
  USING (client_id = public.get_user_client_id());


-- ────────────────────────────────────────────────────────────
-- File: 20260330152001_6a029395-71b8-42a5-bb0a-86e759ad4969.sql
-- ────────────────────────────────────────────────────────────

-- Fix 1: Explicitly deny INSERT on profiles for authenticated users (only trigger can insert)
DROP POLICY IF EXISTS "No direct profile inserts" ON public.profiles;
CREATE POLICY "No direct profile inserts" ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Fix 2: Add client_id to timeline_events and restrict null lead_id events
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'default';

-- Drop existing timeline policies and recreate with client_id scoping
DROP POLICY IF EXISTS "Users can view timeline_events for their leads" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can insert timeline_events for their leads" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can delete timeline_events for their leads" ON public.timeline_events;

DROP POLICY IF EXISTS "Users can view timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can view timeline_events in their client" ON public.timeline_events FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can insert timeline_events in their client" ON public.timeline_events FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can delete timeline_events in their client" ON public.timeline_events FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());


-- ────────────────────────────────────────────────────────────
-- File: 20260330152034_edac6338-1e19-4db6-abca-096357ba80a4.sql
-- ────────────────────────────────────────────────────────────

-- Fix 1: Use trigger instead of RLS subquery to prevent role/is_blocked/client_id changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to enforce immutable fields
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role field directly';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Cannot change is_blocked field directly';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Cannot change client_id field directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_profile_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_immutable_fields();

-- Fix 2: Deny all profile deletes
DROP POLICY IF EXISTS "No profile deletes" ON public.profiles;
CREATE POLICY "No profile deletes" ON public.profiles FOR DELETE
  TO authenticated
  USING (false);


-- ────────────────────────────────────────────────────────────
-- File: 20260330152108_3116f890-dce6-4a8b-97ae-439827622c97.sql
-- ────────────────────────────────────────────────────────────

-- Add missing UPDATE policy for timeline_events
DROP POLICY IF EXISTS "Users can update timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can update timeline_events in their client" ON public.timeline_events FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());


-- ────────────────────────────────────────────────────────────
-- File: 20260330154226_d59e9c97-00b5-415e-994a-a6d480fe4e34.sql
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can view own pipelines') THEN
    DROP POLICY IF EXISTS "Users can view own pipelines" ON public.pipelines;
CREATE POLICY "Users can view own pipelines" ON public.pipelines FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can insert own pipelines') THEN
    DROP POLICY IF EXISTS "Users can insert own pipelines" ON public.pipelines;
CREATE POLICY "Users can insert own pipelines" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can update own pipelines') THEN
    DROP POLICY IF EXISTS "Users can update own pipelines" ON public.pipelines;
CREATE POLICY "Users can update own pipelines" ON public.pipelines FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can delete own pipelines') THEN
    DROP POLICY IF EXISTS "Users can delete own pipelines" ON public.pipelines;
CREATE POLICY "Users can delete own pipelines" ON public.pipelines FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
END $$;

INSERT INTO public.pipelines (client_id, name) VALUES ('c1', 'Funil Principal');

-- ────────────────────────────────────────────────────────────
-- File: 20260330154721_c8f04291-e657-415c-8e23-581aaf1fbb98.sql
-- ────────────────────────────────────────────────────────────
-- Fix handle_new_user to use 'c1' as default client_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, client_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'client_id', 'c1')
  );
  RETURN NEW;
END;
$$;

-- Also fix enforce_profile_immutable_fields: allow service_role to update
-- but block regular users from changing role/is_blocked/client_id
-- This is already fine as SECURITY DEFINER

-- Update default client_id on profiles table
ALTER TABLE public.profiles ALTER COLUMN client_id SET DEFAULT 'c1';

-- ────────────────────────────────────────────────────────────
-- File: 20260330154742_07708fce-807a-4256-a3f3-039ffdf2c4be.sql
-- ────────────────────────────────────────────────────────────
-- Modify the function to allow service role updates, then update
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow migrations and service role to update
  IF current_setting('role') = 'rls_none' OR current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role field directly';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Cannot change is_blocked field directly';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'Cannot change client_id field directly';
  END IF;
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- File: 20260330154903_af0e7816-d7fb-45cf-9b51-beea618e4148.sql
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- File: 20260330173000_automation_rules.sql
-- ────────────────────────────────────────────────────────────
-- Create automation_rules table for basic column-specific automations
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
  column_id UUID REFERENCES public.pipeline_columns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  trigger JSONB NOT NULL DEFAULT '{}'::JSONB,
  actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  exceptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
END $$;

-- Create Scoped RLS Policies
DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can view automation_rules in their client" ON public.automation_rules FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can insert automation_rules in their client" ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can update automation_rules in their client" ON public.automation_rules FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can delete automation_rules in their client" ON public.automation_rules FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- Updated at trigger
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE OR REPLACE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- File: 20260330175705_1b11dfb5-ad33-4155-9ccc-cafb1130404a.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL DEFAULT 'c1',
  pipeline_id text,
  column_id text,
  name text NOT NULL DEFAULT 'Nova Automação',
  active boolean NOT NULL DEFAULT true,
  trigger jsonb NOT NULL DEFAULT '{"type":"card_entered"}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can view automation_rules in their client" ON public.automation_rules FOR SELECT TO authenticated USING (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can insert automation_rules in their client" ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can update automation_rules in their client" ON public.automation_rules FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can delete automation_rules in their client" ON public.automation_rules FOR DELETE TO authenticated USING (client_id = get_user_client_id());


-- ────────────────────────────────────────────────────────────
-- File: 20260331130111_1b16f7c1-d201-47a9-8a18-c783fb7d7aaa.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL DEFAULT 'c1',
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view integrations in their client" ON public.integrations;
CREATE POLICY "Users can view integrations in their client" ON public.integrations FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can insert integrations in their client" ON public.integrations;
CREATE POLICY "Users can insert integrations in their client" ON public.integrations FOR INSERT TO authenticated
WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update integrations in their client" ON public.integrations;
CREATE POLICY "Users can update integrations in their client" ON public.integrations FOR UPDATE TO authenticated
USING (client_id = get_user_client_id())
WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can delete integrations in their client" ON public.integrations;
CREATE POLICY "Users can delete integrations in their client" ON public.integrations FOR DELETE TO authenticated
USING (client_id = get_user_client_id());

CREATE OR REPLACE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- File: 20260331141011_adcafba9-43f9-4306-9801-bd3129dc6734.sql
-- ────────────────────────────────────────────────────────────

-- Conversations table: represents a chat thread between lead and system
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'instagram', 'webchat')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived', 'closed')),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table: individual messages in a conversation
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'file', 'email')),
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
DROP POLICY IF EXISTS "Users can view conversations in their client" ON public.conversations;
CREATE POLICY "Users can view conversations in their client" ON public.conversations FOR SELECT TO authenticated USING (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can insert conversations in their client" ON public.conversations;
CREATE POLICY "Users can insert conversations in their client" ON public.conversations FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can update conversations in their client" ON public.conversations;
CREATE POLICY "Users can update conversations in their client" ON public.conversations FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can delete conversations in their client" ON public.conversations;
CREATE POLICY "Users can delete conversations in their client" ON public.conversations FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages in their client" ON public.messages;
CREATE POLICY "Users can view messages in their client" ON public.messages FOR SELECT TO authenticated USING (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can insert messages in their client" ON public.messages;
CREATE POLICY "Users can insert messages in their client" ON public.messages FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can update messages in their client" ON public.messages;
CREATE POLICY "Users can update messages in their client" ON public.messages FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
DROP POLICY IF EXISTS "Users can delete messages in their client" ON public.messages;
CREATE POLICY "Users can delete messages in their client" ON public.messages FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);


-- ────────────────────────────────────────────────────────────
-- File: 20260331170000_chatwoot_features.sql
-- ────────────────────────────────────────────────────────────

-- =============================================
-- Chatwoot-inspired features migration
-- =============================================

-- 1. Canned Responses (Respostas Rápidas com shortcode)
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  short_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to canned_responses" ON public.canned_responses;
CREATE POLICY "Allow all access to canned_responses" ON public.canned_responses FOR ALL USING (true) WITH CHECK (true);

-- 2. Conversation Labels (etiquetas de conversa com cor)
CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9b87f5',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to conversation_labels" ON public.conversation_labels;
CREATE POLICY "Allow all access to conversation_labels" ON public.conversation_labels FOR ALL USING (true) WITH CHECK (true);

-- 3. Junction table: conversation <-> label (many-to-many)
CREATE TABLE IF NOT EXISTS public.conversation_label_assignments (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, label_id)
);

ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to conversation_label_assignments" ON public.conversation_label_assignments;
CREATE POLICY "Allow all access to conversation_label_assignments" ON public.conversation_label_assignments FOR ALL USING (true) WITH CHECK (true);

-- 4. Expand conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS assignee_id TEXT,
  ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- Drop old status constraint and add expanded one
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('open','pending','resolved','snoozed','archived','closed'));

-- Add priority constraint
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_priority_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_priority_check
  CHECK (priority IN ('none','low','medium','high','urgent'));

-- 5. Expand messages table (private notes)
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text';

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_canned_responses_client ON public.canned_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_conversation_labels_client ON public.conversation_labels(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON public.conversations(assignee_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_is_private ON public.messages(is_private);

-- 7. Seed default canned responses
INSERT INTO public.canned_responses (client_id, short_code, title, content) VALUES
  ('c1', 'boasvindas', 'Boas-vindas', 'Olá {{contact.name}}! Obrigado por entrar em contato. Estamos aqui para ajudá-lo. O que posso fazer por você hoje?'),
  ('c1', 'followup', 'Follow-up', 'Olá {{contact.name}}! Gostaria de saber se teve a oportunidade de avaliar nossa proposta. Fico à disposição para qualquer dúvida!'),
  ('c1', 'obrigado', 'Agradecimento', 'Muito obrigado pela sua confiança! Estamos felizes em tê-lo como cliente. Qualquer necessidade, estamos aqui.'),
  ('c1', 'reagendar', 'Reagendamento', 'Olá {{contact.name}}! Vi que não conseguimos conversar conforme combinado. Gostaria de reagendar para um horário mais conveniente?'),
  ('c1', 'proposta', 'Proposta Enviada', 'Segue em anexo a proposta detalhada conforme conversamos. Fico no aguardo do seu retorno!'),
  ('c1', 'encerrar', 'Encerramento', 'Se houver mais alguma dúvida, estou à disposição. Desejo um ótimo dia!')
ON CONFLICT DO NOTHING;

-- 8. Seed default conversation labels
INSERT INTO public.conversation_labels (client_id, name, color) VALUES
  ('c1', 'Urgente', '#ef4444'),
  ('c1', 'Bug', '#f97316'),
  ('c1', 'Financeiro', '#22c55e'),
  ('c1', 'Suporte', '#3b82f6'),
  ('c1', 'Vendas', '#a855f7'),
  ('c1', 'Feedback', '#06b6d4')
ON CONFLICT DO NOTHING;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.canned_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_labels;


-- ────────────────────────────────────────────────────────────
-- File: 20260331184150_e9cc935c-cb34-4d63-b32e-a54b3eb07c6b.sql
-- ────────────────────────────────────────────────────────────

-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp_media', 'whatsapp_media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp_media');

-- Allow public read access
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Public can read media" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'whatsapp_media');


-- ────────────────────────────────────────────────────────────
-- File: 20260401_add_lead_category.sql
-- ────────────────────────────────────────────────────────────

-- Add category column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'lead' CHECK (category IN ('lead', 'partner', 'collaborator'));

-- Update existing leads to have 'lead' category if null
UPDATE public.leads SET category = 'lead' WHERE category IS NULL;


-- ────────────────────────────────────────────────────────────
-- File: 20260401_add_typebot_to_templates.sql
-- ────────────────────────────────────────────────────────────

-- Add typebot_flow_id to whatsapp_templates
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS typebot_flow_id TEXT;

-- Update RLS or other constraints if necessary (none needed for a simple text column)


-- ────────────────────────────────────────────────────────────
-- File: 20260401_recharge_system.sql
-- ────────────────────────────────────────────────────────────

-- Table to store current credit balance per client
CREATE TABLE IF NOT EXISTS public.client_credits (
    client_id UUID PRIMARY KEY, -- Reference to the organization/client
    balance NUMERIC DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to track recharge intents and payment statuses
CREATE TABLE IF NOT EXISTS public.recharge_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    amount NUMERIC NOT NULL, -- Amount in BRL
    credits_to_add NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    external_id TEXT, -- Asaas Payment ID
    payment_link TEXT, -- Asaas Checkout/Pix Link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_intents ENABLE ROW LEVEL SECURITY;

-- Note: In a production environment, you should use client_id based on a JWT claim 
-- (e.g., auth.uid() or a custom claim). Here we assume the app passes client_id correctly.

DROP POLICY IF EXISTS "Clients can view their own credits" ON public.client_credits;
CREATE POLICY "Clients can view their own credits" ON public.client_credits FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

DROP POLICY IF EXISTS "Clients can view their own recharge intents" ON public.recharge_intents;
CREATE POLICY "Clients can view their own recharge intents" ON public.recharge_intents FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

-- Function to handle balance increment (atomic)
CREATE OR REPLACE FUNCTION public.increment_client_credits(client_id_param UUID, amount_param NUMERIC)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.client_credits (client_id, balance)
    VALUES (client_id_param, amount_param)
    ON CONFLICT (client_id)
    DO UPDATE SET 
        balance = client_credits.balance + amount_param,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- File: 20260401_whatsapp_templates.sql
-- ────────────────────────────────────────────────────────────

-- Table for WhatsApp Templates Management
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own templates" ON public.whatsapp_templates;
CREATE POLICY "Clients can view their own templates" ON public.whatsapp_templates FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

DROP POLICY IF EXISTS "Clients can create their own templates" ON public.whatsapp_templates;
CREATE POLICY "Clients can create their own templates" ON public.whatsapp_templates FOR INSERT
TO authenticated
WITH CHECK (client_id::text = (select get_user_client_id()));

DROP POLICY IF EXISTS "Clients can update their own templates" ON public.whatsapp_templates;
CREATE POLICY "Clients can update their own templates" ON public.whatsapp_templates FOR UPDATE
TO authenticated
USING (client_id::text = (select get_user_client_id()));


-- ────────────────────────────────────────────────────────────
-- File: 20260404165526_25591abc-9548-423b-9248-14ef97435b53.sql
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL DEFAULT 'c1',
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- File: 20260406144316_d7079464-5862-461c-a052-e27367510779.sql
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.leads ADD COLUMN category text NOT NULL DEFAULT 'lead';

-- ────────────────────────────────────────────────────────────
-- File: 20260406145102_891aba5f-bfa1-4024-acd8-867a348fdb72.sql
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.conversations DROP CONSTRAINT conversations_status_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check CHECK (status = ANY (ARRAY['open', 'pending', 'resolved', 'snoozed', 'archived', 'closed']));

-- ────────────────────────────────────────────────────────────
-- File: 20260407145601_35a23b56-33f2-4cb8-b4c0-407af9a51101.sql
-- ────────────────────────────────────────────────────────────

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 3. Create is_master_user function
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master'
  )
$$;

-- 4. Organization RLS policies
DROP POLICY IF EXISTS "Masters can view all organizations" ON public.organizations;
CREATE POLICY "Masters can view all organizations" ON public.organizations FOR SELECT TO authenticated
USING (public.is_master_user());

DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
CREATE POLICY "Members can view own organization" ON public.organizations FOR SELECT TO authenticated
USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization" ON public.organizations FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their organization" ON public.organizations;
CREATE POLICY "Owners can delete their organization" ON public.organizations FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- 5. Update handle_new_user to assign unique client_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, client_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'client_id', NEW.id::text)
  );
  RETURN NEW;
END;
$$;

-- 6. Update RLS for all tables to allow master access
-- automation_rules
DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can view automation_rules in their client" ON public.automation_rules
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can insert automation_rules in their client" ON public.automation_rules
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can update automation_rules in their client" ON public.automation_rules
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can delete automation_rules in their client" ON public.automation_rules
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- automations
DROP POLICY IF EXISTS "Users can view automations in their client" ON public.automations;
DROP POLICY IF EXISTS "Users can view automations in their client" ON public.automations;
CREATE POLICY "Users can view automations in their client" ON public.automations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert automations in their client" ON public.automations;
DROP POLICY IF EXISTS "Users can insert automations in their client" ON public.automations;
CREATE POLICY "Users can insert automations in their client" ON public.automations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update automations in their client" ON public.automations;
DROP POLICY IF EXISTS "Users can update automations in their client" ON public.automations;
CREATE POLICY "Users can update automations in their client" ON public.automations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete automations in their client" ON public.automations;
DROP POLICY IF EXISTS "Users can delete automations in their client" ON public.automations;
CREATE POLICY "Users can delete automations in their client" ON public.automations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- conversations
DROP POLICY IF EXISTS "Users can view conversations in their client" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations in their client" ON public.conversations;
CREATE POLICY "Users can view conversations in their client" ON public.conversations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert conversations in their client" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations in their client" ON public.conversations;
CREATE POLICY "Users can insert conversations in their client" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update conversations in their client" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations in their client" ON public.conversations;
CREATE POLICY "Users can update conversations in their client" ON public.conversations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete conversations in their client" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations in their client" ON public.conversations;
CREATE POLICY "Users can delete conversations in their client" ON public.conversations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- integrations
DROP POLICY IF EXISTS "Users can view integrations in their client" ON public.integrations;
DROP POLICY IF EXISTS "Users can view integrations in their client" ON public.integrations;
CREATE POLICY "Users can view integrations in their client" ON public.integrations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert integrations in their client" ON public.integrations;
DROP POLICY IF EXISTS "Users can insert integrations in their client" ON public.integrations;
CREATE POLICY "Users can insert integrations in their client" ON public.integrations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update integrations in their client" ON public.integrations;
DROP POLICY IF EXISTS "Users can update integrations in their client" ON public.integrations;
CREATE POLICY "Users can update integrations in their client" ON public.integrations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete integrations in their client" ON public.integrations;
DROP POLICY IF EXISTS "Users can delete integrations in their client" ON public.integrations;
CREATE POLICY "Users can delete integrations in their client" ON public.integrations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- leads
DROP POLICY IF EXISTS "Users can view leads in their client" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads in their client" ON public.leads;
CREATE POLICY "Users can view leads in their client" ON public.leads
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert leads in their client" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads in their client" ON public.leads;
CREATE POLICY "Users can insert leads in their client" ON public.leads
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update leads in their client" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their client" ON public.leads;
CREATE POLICY "Users can update leads in their client" ON public.leads
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete leads in their client" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads in their client" ON public.leads;
CREATE POLICY "Users can delete leads in their client" ON public.leads
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- messages
DROP POLICY IF EXISTS "Users can view messages in their client" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their client" ON public.messages;
CREATE POLICY "Users can view messages in their client" ON public.messages
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert messages in their client" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their client" ON public.messages;
CREATE POLICY "Users can insert messages in their client" ON public.messages
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update messages in their client" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their client" ON public.messages;
CREATE POLICY "Users can update messages in their client" ON public.messages
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete messages in their client" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in their client" ON public.messages;
CREATE POLICY "Users can delete messages in their client" ON public.messages
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- pipeline_columns
DROP POLICY IF EXISTS "Users can view pipeline_columns in their client" ON public.pipeline_columns;
DROP POLICY IF EXISTS "Users can view pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can view pipeline_columns in their client" ON public.pipeline_columns
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert pipeline_columns in their client" ON public.pipeline_columns;
DROP POLICY IF EXISTS "Users can insert pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can insert pipeline_columns in their client" ON public.pipeline_columns
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update pipeline_columns in their client" ON public.pipeline_columns;
DROP POLICY IF EXISTS "Users can update pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can update pipeline_columns in their client" ON public.pipeline_columns
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete pipeline_columns in their client" ON public.pipeline_columns;
DROP POLICY IF EXISTS "Users can delete pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can delete pipeline_columns in their client" ON public.pipeline_columns
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- pipelines
DROP POLICY IF EXISTS "Users can view own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can view own pipelines" ON public.pipelines;
CREATE POLICY "Users can view own pipelines" ON public.pipelines
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can insert own pipelines" ON public.pipelines;
CREATE POLICY "Users can insert own pipelines" ON public.pipelines
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can update own pipelines" ON public.pipelines;
CREATE POLICY "Users can update own pipelines" ON public.pipelines
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can delete own pipelines" ON public.pipelines;
CREATE POLICY "Users can delete own pipelines" ON public.pipelines
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- profiles - update SELECT to allow master
DROP POLICY IF EXISTS "Users can read profiles in their client" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles in their client" ON public.profiles;
CREATE POLICY "Users can read profiles in their client" ON public.profiles
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- tasks
DROP POLICY IF EXISTS "Users can view tasks in their client" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their client" ON public.tasks;
CREATE POLICY "Users can view tasks in their client" ON public.tasks
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert tasks in their client" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their client" ON public.tasks;
CREATE POLICY "Users can insert tasks in their client" ON public.tasks
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update tasks in their client" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in their client" ON public.tasks;
CREATE POLICY "Users can update tasks in their client" ON public.tasks
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete tasks in their client" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their client" ON public.tasks;
CREATE POLICY "Users can delete tasks in their client" ON public.tasks
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- timeline_events
DROP POLICY IF EXISTS "Users can view timeline_events in their client" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can view timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can view timeline_events in their client" ON public.timeline_events
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert timeline_events in their client" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can insert timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can insert timeline_events in their client" ON public.timeline_events
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update timeline_events in their client" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can update timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can update timeline_events in their client" ON public.timeline_events
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete timeline_events in their client" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can delete timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can delete timeline_events in their client" ON public.timeline_events
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- push_subscriptions (keep user-level, add master)
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_master_user());

-- Trigger for organizations updated_at
CREATE OR REPLACE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- File: 20260422_multi_tenant.sql
-- ────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════
-- Multi-tenant por subdomínio — uPixel CRM
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. Tabela tenants
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  subdomain   TEXT        NOT NULL UNIQUE
                          CHECK (subdomain ~ '^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$'),
  plan        TEXT        NOT NULL DEFAULT 'free',
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode consultar tenants pelo subdomain (necessário antes do login)
DROP POLICY IF EXISTS "Public can read tenants" ON public.tenants;
CREATE POLICY "Public can read tenants" ON public.tenants FOR SELECT
  USING (true);

-- Apenas owner pode atualizar
DROP POLICY IF EXISTS "Owner can update tenant" ON public.tenants;
CREATE POLICY "Owner can update tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Apenas owner pode deletar
DROP POLICY IF EXISTS "Owner can delete tenant" ON public.tenants;
CREATE POLICY "Owner can delete tenant" ON public.tenants FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Usuário autenticado pode inserir (o owner_id será setado logo após o signUp)
DROP POLICY IF EXISTS "Authenticated can insert tenant" ON public.tenants;
CREATE POLICY "Authenticated can insert tenant" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- 2. Adicionar tenant_id nas tabelas principais
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_columns
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Índices para performance nas queries por tenant
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id           ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id           ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id       ON public.pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_columns_tenant_id ON public.pipeline_columns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id   ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id        ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id    ON public.integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_tenant_id     ON public.automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_id ON public.automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_tenant_id ON public.timeline_events(tenant_id);


-- ────────────────────────────────────────────────────────────
-- 3. Função get_user_tenant_id()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ────────────────────────────────────────────────────────────
-- 4. Atualizar handle_new_user para aceitar tenant_id
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_client_id TEXT;
BEGIN
  -- tenant_id vem de raw_user_meta_data quando o signup é feito via LandingPage
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  -- client_id = tenant_id::text para manter retrocompatibilidade com RLS existente
  -- Se não há tenant_id (usuário avulso), usa o próprio user id
  IF v_tenant_id IS NOT NULL THEN
    v_client_id := v_tenant_id::text;
  ELSE
    v_client_id := NEW.id::text;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, client_id, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    v_client_id,
    v_tenant_id
  );
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 5. Políticas RLS por tenant_id (segunda camada, complementar)
-- ────────────────────────────────────────────────────────────

-- leads
DROP POLICY IF EXISTS "Tenant isolation on leads" ON public.leads;
CREATE POLICY "Tenant isolation on leads" ON public.leads FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- tasks
DROP POLICY IF EXISTS "Tenant isolation on tasks" ON public.tasks;
CREATE POLICY "Tenant isolation on tasks" ON public.tasks FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- pipelines
DROP POLICY IF EXISTS "Tenant isolation on pipelines" ON public.pipelines;
CREATE POLICY "Tenant isolation on pipelines" ON public.pipelines FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- pipeline_columns
DROP POLICY IF EXISTS "Tenant isolation on pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "Tenant isolation on pipeline_columns" ON public.pipeline_columns FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- conversations
DROP POLICY IF EXISTS "Tenant isolation on conversations" ON public.conversations;
CREATE POLICY "Tenant isolation on conversations" ON public.conversations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- messages
DROP POLICY IF EXISTS "Tenant isolation on messages" ON public.messages;
CREATE POLICY "Tenant isolation on messages" ON public.messages FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- integrations
DROP POLICY IF EXISTS "Tenant isolation on integrations" ON public.integrations;
CREATE POLICY "Tenant isolation on integrations" ON public.integrations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- automations
DROP POLICY IF EXISTS "Tenant isolation on automations" ON public.automations;
CREATE POLICY "Tenant isolation on automations" ON public.automations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- automation_rules
DROP POLICY IF EXISTS "Tenant isolation on automation_rules" ON public.automation_rules;
CREATE POLICY "Tenant isolation on automation_rules" ON public.automation_rules FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- timeline_events
DROP POLICY IF EXISTS "Tenant isolation on timeline_events" ON public.timeline_events;
CREATE POLICY "Tenant isolation on timeline_events" ON public.timeline_events FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- push_subscriptions
DROP POLICY IF EXISTS "Tenant isolation on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Tenant isolation on push_subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

