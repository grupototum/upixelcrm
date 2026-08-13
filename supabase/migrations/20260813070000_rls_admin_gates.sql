-- Fase 3 — Gerenciar etapas do funil e editar tarefas: só admin.
--
-- POR QUE RESTRICTIVE (e não reescrever as policies de UPDATE/DELETE):
-- pipeline_columns e tasks já têm DUAS policies PERMISSIVE cobrindo escrita —
-- "Users can update/delete ... in their client" (por client_id) e
-- "Tenant isolation on ..." (FOR ALL, por tenant_id). Policies permissivas se
-- somam com OR, então apertar só uma delas não travaria nada: a outra continuaria
-- liberando. Uma policy RESTRICTIVE faz AND com o resultado desse OR, virando
-- uma trava real. Mesmo padrão de blocked_users_no_access_*
-- (20260416_blocked_user_rls.sql).
--
-- "Admin" aqui = supervisor (o nome do papel de admin neste sistema), admin
-- (previsto no AuthContext) e master. Funções envolvidas em (select ...) para
-- o planner cachear por statement — padrão de
-- 20260610120300_perf_rls_initplan_select_wrap.sql.

-- ============================================================
-- pipeline_columns: editar e excluir etapa do funil
-- ============================================================

DROP POLICY IF EXISTS "admins_only_update_pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "admins_only_update_pipeline_columns"
ON public.pipeline_columns AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  (select public.get_user_role()) IN ('supervisor', 'admin')
  OR (select public.is_master_user())
);

DROP POLICY IF EXISTS "admins_only_delete_pipeline_columns" ON public.pipeline_columns;
CREATE POLICY "admins_only_delete_pipeline_columns"
ON public.pipeline_columns AS RESTRICTIVE
FOR DELETE TO authenticated
USING (
  (select public.get_user_role()) IN ('supervisor', 'admin')
  OR (select public.is_master_user())
);

-- INSERT segue liberado de propósito: addPipeline() cria as colunas padrão do
-- funil novo, e criar funil não é ação restrita.

-- ============================================================
-- tasks: edição direta só admin
-- ============================================================
-- Concluir, reabrir e registrar resultado continuam liberados para qualquer
-- usuário do tenant — via os RPCs abaixo, não via UPDATE direto.

DROP POLICY IF EXISTS "admins_only_update_tasks" ON public.tasks;
CREATE POLICY "admins_only_update_tasks"
ON public.tasks AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  (select public.get_user_role()) IN ('supervisor', 'admin')
  OR (select public.is_master_user())
);

-- ============================================================
-- RPCs do fluxo de conclusão (usuário comum)
-- ============================================================
-- SECURITY DEFINER contorna a policy acima de propósito, mas cada função mexe
-- só em status/result/completed_at — nunca em título, prazo ou responsável.
-- O isolamento por tenant e a trava de usuário bloqueado são refeitos aqui
-- dentro, já que RLS não se aplica ao dono da função.
-- Retornam boolean porque UPDATE barrado por RLS afeta 0 linhas SEM erro: sem
-- esse retorno, a UI otimista exibiria sucesso para uma escrita que não houve.

CREATE OR REPLACE FUNCTION public.complete_task(p_task_id uuid, p_result text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.tasks
  SET status = 'completed',
      result = NULLIF(btrim(COALESCE(p_result, '')), ''),
      completed_at = now()
  WHERE id = p_task_id
    AND status <> 'completed'
    AND NOT public.is_user_blocked()
    AND (client_id = public.get_user_client_id() OR public.is_master_user());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Reabrir limpa completed_at: tarefa pendente com data de conclusão falsearia
-- a contagem de "tarefas concluídas" das metas.
CREATE OR REPLACE FUNCTION public.reopen_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.tasks
  SET status = 'pending',
      completed_at = NULL
  WHERE id = p_task_id
    AND status = 'completed'
    AND NOT public.is_user_blocked()
    AND (client_id = public.get_user_client_id() OR public.is_master_user());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_result(p_task_id uuid, p_result text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.tasks
  SET result = NULLIF(btrim(COALESCE(p_result, '')), '')
  WHERE id = p_task_id
    AND status = 'completed'
    AND NOT public.is_user_blocked()
    AND (client_id = public.get_user_client_id() OR public.is_master_user());
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- anon precisa de REVOKE explícito: o Supabase concede EXECUTE em funções novas
-- para anon/authenticated via ALTER DEFAULT PRIVILEGES, e esse grant direto não
-- some com REVOKE ... FROM PUBLIC.
REVOKE ALL ON FUNCTION public.complete_task(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_task(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_task_result(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_task_result(uuid, text) TO authenticated;
