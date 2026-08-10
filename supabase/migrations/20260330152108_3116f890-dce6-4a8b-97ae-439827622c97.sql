
-- Add missing UPDATE policy for timeline_events
CREATE POLICY "Users can update timeline_events in their client"
  ON public.timeline_events FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());
