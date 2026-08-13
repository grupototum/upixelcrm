-- Fix da 20260813080000_goals_v2.sql: leads.responsible_id é TEXT (não UUID),
-- goals_progress() comparava direto com goal_assignments.user_id (UUID) e
-- quebrava com "operator does not exist: text = uuid" em qualquer chamada.

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
       AND (ga.user_id IS NULL OR l.responsible_id = ga.user_id::text))::bigint
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

  SELECT g.id, ga.user_id,
    (SELECT count(*) FROM public.leads l
     WHERE l.column_id = g.column_id AND l.updated_at >= p_start AND l.updated_at < p_end
       AND (ga.user_id IS NULL OR l.responsible_id = ga.user_id::text))::bigint
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
