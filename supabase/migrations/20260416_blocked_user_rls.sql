-- supabase/migrations/20260416_blocked_user_rls.sql
-- Explicação: Políticas RESTRICTIVE são necessárias porque, diferentemente das políticas
-- PERMISSIVE (onde basta uma regra passar para autorizar o acesso), uma regra RESTRICTIVE 
-- sobrepõe-se às PERMISSIVE, bloqueando o acesso de forma peremptória caso a condição não seja atendida.

CREATE OR REPLACE FUNCTION public.is_user_blocked()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_blocked FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Utilizamos DROP POLICY IF EXISTS de maneira preventiva e re-criamos a política
-- emulação da diretiva CREATE POLICY IF NOT EXISTS por compatibilidade do parser PG padrão.

DROP POLICY IF EXISTS "blocked_users_no_access_leads" ON public.leads;
CREATE POLICY "blocked_users_no_access_leads"
ON public.leads AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "blocked_users_no_access_pipeline_columns"
ON public.pipeline_columns AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_tasks" ON public.tasks;
CREATE POLICY "blocked_users_no_access_tasks"
ON public.tasks AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_conversations" ON public.conversations;
CREATE POLICY "blocked_users_no_access_conversations"
ON public.conversations AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_messages" ON public.messages;
CREATE POLICY "blocked_users_no_access_messages"
ON public.messages AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_timeline_events" ON public.timeline_events;
CREATE POLICY "blocked_users_no_access_timeline_events"
ON public.timeline_events AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_automations" ON public.automations;
CREATE POLICY "blocked_users_no_access_automations"
ON public.automations AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());

DROP POLICY IF EXISTS "blocked_users_no_access_automation_rules" ON public.automation_rules;
CREATE POLICY "blocked_users_no_access_automation_rules"
ON public.automation_rules AS RESTRICTIVE
TO authenticated
USING (NOT public.is_user_blocked());
