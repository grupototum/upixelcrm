
-- 1. Create organizations table
CREATE TABLE public.organizations (
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
CREATE POLICY "Masters can view all organizations"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_master_user());

CREATE POLICY "Members can view own organization"
ON public.organizations FOR SELECT TO authenticated
USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organization"
ON public.organizations FOR DELETE TO authenticated
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
CREATE POLICY "Users can view automation_rules in their client" ON public.automation_rules
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can insert automation_rules in their client" ON public.automation_rules
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can update automation_rules in their client" ON public.automation_rules
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
CREATE POLICY "Users can delete automation_rules in their client" ON public.automation_rules
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- automations
DROP POLICY IF EXISTS "Users can view automations in their client" ON public.automations;
CREATE POLICY "Users can view automations in their client" ON public.automations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert automations in their client" ON public.automations;
CREATE POLICY "Users can insert automations in their client" ON public.automations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update automations in their client" ON public.automations;
CREATE POLICY "Users can update automations in their client" ON public.automations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete automations in their client" ON public.automations;
CREATE POLICY "Users can delete automations in their client" ON public.automations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- conversations
DROP POLICY IF EXISTS "Users can view conversations in their client" ON public.conversations;
CREATE POLICY "Users can view conversations in their client" ON public.conversations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert conversations in their client" ON public.conversations;
CREATE POLICY "Users can insert conversations in their client" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update conversations in their client" ON public.conversations;
CREATE POLICY "Users can update conversations in their client" ON public.conversations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete conversations in their client" ON public.conversations;
CREATE POLICY "Users can delete conversations in their client" ON public.conversations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- integrations
DROP POLICY IF EXISTS "Users can view integrations in their client" ON public.integrations;
CREATE POLICY "Users can view integrations in their client" ON public.integrations
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert integrations in their client" ON public.integrations;
CREATE POLICY "Users can insert integrations in their client" ON public.integrations
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update integrations in their client" ON public.integrations;
CREATE POLICY "Users can update integrations in their client" ON public.integrations
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete integrations in their client" ON public.integrations;
CREATE POLICY "Users can delete integrations in their client" ON public.integrations
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- leads
DROP POLICY IF EXISTS "Users can view leads in their client" ON public.leads;
CREATE POLICY "Users can view leads in their client" ON public.leads
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert leads in their client" ON public.leads;
CREATE POLICY "Users can insert leads in their client" ON public.leads
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update leads in their client" ON public.leads;
CREATE POLICY "Users can update leads in their client" ON public.leads
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete leads in their client" ON public.leads;
CREATE POLICY "Users can delete leads in their client" ON public.leads
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- messages
DROP POLICY IF EXISTS "Users can view messages in their client" ON public.messages;
CREATE POLICY "Users can view messages in their client" ON public.messages
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert messages in their client" ON public.messages;
CREATE POLICY "Users can insert messages in their client" ON public.messages
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update messages in their client" ON public.messages;
CREATE POLICY "Users can update messages in their client" ON public.messages
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete messages in their client" ON public.messages;
CREATE POLICY "Users can delete messages in their client" ON public.messages
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- pipeline_columns
DROP POLICY IF EXISTS "Users can view pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can view pipeline_columns in their client" ON public.pipeline_columns
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can insert pipeline_columns in their client" ON public.pipeline_columns
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can update pipeline_columns in their client" ON public.pipeline_columns
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete pipeline_columns in their client" ON public.pipeline_columns;
CREATE POLICY "Users can delete pipeline_columns in their client" ON public.pipeline_columns
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- pipelines
DROP POLICY IF EXISTS "Users can view own pipelines" ON public.pipelines;
CREATE POLICY "Users can view own pipelines" ON public.pipelines
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert own pipelines" ON public.pipelines;
CREATE POLICY "Users can insert own pipelines" ON public.pipelines
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update own pipelines" ON public.pipelines;
CREATE POLICY "Users can update own pipelines" ON public.pipelines
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete own pipelines" ON public.pipelines;
CREATE POLICY "Users can delete own pipelines" ON public.pipelines
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- profiles - update SELECT to allow master
DROP POLICY IF EXISTS "Users can read profiles in their client" ON public.profiles;
CREATE POLICY "Users can read profiles in their client" ON public.profiles
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- tasks
DROP POLICY IF EXISTS "Users can view tasks in their client" ON public.tasks;
CREATE POLICY "Users can view tasks in their client" ON public.tasks
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert tasks in their client" ON public.tasks;
CREATE POLICY "Users can insert tasks in their client" ON public.tasks
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update tasks in their client" ON public.tasks;
CREATE POLICY "Users can update tasks in their client" ON public.tasks
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete tasks in their client" ON public.tasks;
CREATE POLICY "Users can delete tasks in their client" ON public.tasks
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- timeline_events
DROP POLICY IF EXISTS "Users can view timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can view timeline_events in their client" ON public.timeline_events
FOR SELECT TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can insert timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can insert timeline_events in their client" ON public.timeline_events
FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());

DROP POLICY IF EXISTS "Users can update timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can update timeline_events in their client" ON public.timeline_events
FOR UPDATE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

DROP POLICY IF EXISTS "Users can delete timeline_events in their client" ON public.timeline_events;
CREATE POLICY "Users can delete timeline_events in their client" ON public.timeline_events
FOR DELETE TO authenticated USING (client_id = get_user_client_id() OR public.is_master_user());

-- push_subscriptions (keep user-level, add master)
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_master_user());

-- Trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
