-- =============================================
-- Fix RLS for Chatwoot-inspired tables
-- Replaces "ALLOW ALL" policies with tenant isolation
-- using the project pattern: get_user_client_id() + is_master_user()
-- =============================================

-- Drop open policies
DROP POLICY IF EXISTS "Allow all access to canned_responses" ON public.canned_responses;
DROP POLICY IF EXISTS "Allow all access to conversation_labels" ON public.conversation_labels;
DROP POLICY IF EXISTS "Allow all access to conversation_label_assignments" ON public.conversation_label_assignments;

-- =============================================
-- canned_responses
-- =============================================
CREATE POLICY "Users can view canned_responses in their client"
  ON public.canned_responses FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can insert canned_responses in their client"
  ON public.canned_responses FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can update canned_responses in their client"
  ON public.canned_responses FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can delete canned_responses in their client"
  ON public.canned_responses FOR DELETE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

-- =============================================
-- conversation_labels
-- =============================================
CREATE POLICY "Users can view conversation_labels in their client"
  ON public.conversation_labels FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can insert conversation_labels in their client"
  ON public.conversation_labels FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can update conversation_labels in their client"
  ON public.conversation_labels FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can delete conversation_labels in their client"
  ON public.conversation_labels FOR DELETE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

-- =============================================
-- conversation_label_assignments
-- Tenant isolation derived from parent conversation.client_id
-- =============================================
CREATE POLICY "Users can view label_assignments in their client"
  ON public.conversation_label_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_label_assignments.conversation_id
        AND (c.client_id = get_user_client_id() OR public.is_master_user())
    )
  );

CREATE POLICY "Users can insert label_assignments in their client"
  ON public.conversation_label_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_label_assignments.conversation_id
        AND c.client_id = get_user_client_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_labels l
      WHERE l.id = conversation_label_assignments.label_id
        AND l.client_id = get_user_client_id()
    )
  );

CREATE POLICY "Users can delete label_assignments in their client"
  ON public.conversation_label_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_label_assignments.conversation_id
        AND (c.client_id = get_user_client_id() OR public.is_master_user())
    )
  );
