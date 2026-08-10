
-- Fix 1: Explicitly deny INSERT on profiles for authenticated users (only trigger can insert)
CREATE POLICY "No direct profile inserts"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Fix 2: Add client_id to timeline_events and restrict null lead_id events
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT 'default';

-- Drop existing timeline policies and recreate with client_id scoping
DROP POLICY IF EXISTS "Users can view timeline_events for their leads" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can insert timeline_events for their leads" ON public.timeline_events;
DROP POLICY IF EXISTS "Users can delete timeline_events for their leads" ON public.timeline_events;

CREATE POLICY "Users can view timeline_events in their client"
  ON public.timeline_events FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert timeline_events in their client"
  ON public.timeline_events FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete timeline_events in their client"
  ON public.timeline_events FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());
