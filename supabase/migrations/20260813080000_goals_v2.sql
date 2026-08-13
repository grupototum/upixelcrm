-- Fase 7a — Metas v2 (PRD-pagina-metas-upixel.md), adaptado ao schema real:
-- client_id TEXT (não UUID FK), pipeline_columns/column_id (não pipeline_stages),
-- get_user_client_id()/is_master_user() (não get_client_id()). Evolutiva sobre
-- a tabela `goals` já existente (20260813050000_goals.sql) — não recria do zero.
--
-- Dados vivos hoje: 19 goals, todas inativas e sem assignee — backfill seguro.

-- ============================================================
-- 1. goals: novas métricas e período trimestral
-- ============================================================

ALTER TABLE public.goals DROP CONSTRAINT goals_metric_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_metric_check CHECK (metric IN
  ('leads_created', 'tasks_completed', 'contacts_made', 'leads_closed', 'calls_made', 'meetings_done'));

ALTER TABLE public.goals DROP CONSTRAINT goals_period_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_period_check CHECK (period IN
  ('daily', 'weekly', 'monthly', 'quarterly'));

COMMENT ON COLUMN public.goals.assigned_to IS
  'DEPRECATED — substituído por goal_assignments (permite múltiplos usuários ou equipe toda). Mantido só pelo backfill histórico, não escrever mais aqui.';

-- ============================================================
-- 2. goal_assignments — goal → usuário (NULL = equipe toda)
-- ============================================================

CREATE TABLE public.goal_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  tenant_id  UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UNIQUE normal não pega múltiplos NULL (cada um é distinto pro Postgres) —
-- índice com COALESCE trata "equipe toda" como um valor único por goal.
CREATE UNIQUE INDEX uq_goal_assignments
  ON public.goal_assignments (goal_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_goal_assignments_user ON public.goal_assignments(user_id);
CREATE INDEX idx_goal_assignments_client ON public.goal_assignments(client_id);

INSERT INTO public.goal_assignments (goal_id, user_id, client_id, tenant_id)
SELECT id, assigned_to, client_id, tenant_id FROM public.goals
ON CONFLICT DO NOTHING;

ALTER TABLE public.goal_assignments ENABLE ROW LEVEL SECURITY;

-- Leitura por qualquer usuário do tenant (dono ou não) — precisa ver quem
-- está na meta pra montar leaderboard/detalhe. Escrita só admin, mesmo
-- predicado da Fase 3 (RESTRICTIVE em pipeline_columns/tasks).
CREATE POLICY "goal_assignments_select"
  ON public.goal_assignments FOR SELECT TO authenticated
  USING (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()));

CREATE POLICY "goal_assignments_write_admin"
  ON public.goal_assignments FOR ALL TO authenticated
  USING (
    (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()))
    AND ((select public.get_user_role()) IN ('supervisor', 'admin') OR (select public.is_master_user()))
  )
  WITH CHECK (
    (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()))
    AND ((select public.get_user_role()) IN ('supervisor', 'admin') OR (select public.is_master_user()))
  );

-- ============================================================
-- 3. goals: escrita vira admin-only (hoje qualquer usuário do tenant edita)
-- ============================================================

DROP POLICY "Tenant isolation on goals" ON public.goals;

CREATE POLICY "goals_select"
  ON public.goals FOR SELECT TO authenticated
  USING (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()));

CREATE POLICY "goals_write_admin"
  ON public.goals FOR ALL TO authenticated
  USING (
    (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()))
    AND ((select public.get_user_role()) IN ('supervisor', 'admin') OR (select public.is_master_user()))
  )
  WITH CHECK (
    (client_id = (select public.get_user_client_id()) OR (select public.is_master_user()))
    AND ((select public.get_user_role()) IN ('supervisor', 'admin') OR (select public.is_master_user()))
  );

-- ============================================================
-- 4. tasks: assigned_to_id (dono real da tarefa) + priority (bug pré-existente:
--    o seletor de prioridade da UI grava num campo que nunca existiu no banco)
-- ============================================================

ALTER TABLE public.tasks ADD COLUMN assigned_to_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);

ALTER TABLE public.tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- ============================================================
-- 5. timeline_events: 'meeting' como tipo + autor (métricas calls_made/
--    meetings_done e leaderboard por pessoa precisam saber quem registrou)
-- ============================================================

ALTER TABLE public.timeline_events DROP CONSTRAINT timeline_events_type_check;
ALTER TABLE public.timeline_events ADD CONSTRAINT timeline_events_type_check CHECK (type IN
  ('message', 'stage_change', 'note', 'task', 'automation', 'call', 'meeting'));

ALTER TABLE public.timeline_events ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_timeline_metric ON public.timeline_events(client_id, type, created_at);
-- Tabela pequena hoje (dezenas de linhas por tenant) — índice comum é
-- suficiente; CONCURRENTLY vira necessário só se o volume crescer muito.

-- ============================================================
-- 6. RPC goals_progress — mesmo padrão de dashboard_kpis(): SECURITY INVOKER,
--    a RLS de leads/tasks/timeline_events do próprio chamador isola por tenant,
--    a função só agrega. 1 linha por (goal, assignment) no range pedido;
--    assignment com user_id NULL = total da equipe.
-- ============================================================

CREATE OR REPLACE FUNCTION public.goals_progress(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(goal_id uuid, user_id uuid, current_value bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.leads l
     WHERE l.created_at >= p_start AND l.created_at < p_end
       AND (ga.user_id IS NULL OR l.responsible_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'leads_created'

  UNION ALL

  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.tasks t
     WHERE t.status = 'completed' AND t.completed_at >= p_start AND t.completed_at < p_end
       AND (ga.user_id IS NULL OR t.assigned_to_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'tasks_completed'

  UNION ALL

  -- Aproximação: usa a coluna ATUAL do lead + updated_at no range. Um lead que
  -- passou pela etapa de fechamento e saiu depois não aparece — aceitável pro
  -- histórico de períodos anteriores, documentado na UI.
  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.leads l
     WHERE l.column_id = g.column_id AND l.updated_at >= p_start AND l.updated_at < p_end
       AND (ga.user_id IS NULL OR l.responsible_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'leads_closed' AND g.column_id IS NOT NULL

  UNION ALL

  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.timeline_events te
     WHERE te.type = 'note' AND te.created_at >= p_start AND te.created_at < p_end
       AND (ga.user_id IS NULL OR te.user_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'contacts_made'

  UNION ALL

  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.timeline_events te
     WHERE te.type = 'call' AND te.created_at >= p_start AND te.created_at < p_end
       AND (ga.user_id IS NULL OR te.user_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'calls_made'

  UNION ALL

  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.timeline_events te
     WHERE te.type = 'meeting' AND te.created_at >= p_start AND te.created_at < p_end
       AND (ga.user_id IS NULL OR te.user_id = ga.user_id))::bigint
  FROM public.goals g JOIN public.goal_assignments ga ON ga.goal_id = g.id
  WHERE g.is_active AND g.metric = 'meetings_done';
END;
$$;

REVOKE ALL ON FUNCTION public.goals_progress(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.goals_progress(timestamptz, timestamptz) TO authenticated;
