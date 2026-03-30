
-- 1. Create profiles table
CREATE TABLE public.profiles (
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
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
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

CREATE TRIGGER on_auth_user_created
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
CREATE POLICY "Users can view leads in their client"
  ON public.leads FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert leads in their client"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can update leads in their client"
  ON public.leads FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete leads in their client"
  ON public.leads FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 5. Tasks policies
CREATE POLICY "Users can view tasks in their client"
  ON public.tasks FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert tasks in their client"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can update tasks in their client"
  ON public.tasks FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete tasks in their client"
  ON public.tasks FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 6. Automations policies
CREATE POLICY "Users can view automations in their client"
  ON public.automations FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert automations in their client"
  ON public.automations FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can update automations in their client"
  ON public.automations FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete automations in their client"
  ON public.automations FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 7. Pipeline columns policies
CREATE POLICY "Users can view pipeline_columns in their client"
  ON public.pipeline_columns FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert pipeline_columns in their client"
  ON public.pipeline_columns FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can update pipeline_columns in their client"
  ON public.pipeline_columns FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete pipeline_columns in their client"
  ON public.pipeline_columns FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- 8. Timeline events - join through leads for client_id scoping
CREATE POLICY "Users can view timeline_events for their leads"
  ON public.timeline_events FOR SELECT TO authenticated
  USING (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

CREATE POLICY "Users can insert timeline_events for their leads"
  ON public.timeline_events FOR INSERT TO authenticated
  WITH CHECK (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

CREATE POLICY "Users can delete timeline_events for their leads"
  ON public.timeline_events FOR DELETE TO authenticated
  USING (
    lead_id IS NULL OR
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = timeline_events.lead_id AND leads.client_id = public.get_user_client_id())
  );

-- 9. Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
