-- Corrige o escopo do dashboard: a função passa a aceitar o client_id do tenant
-- atual (subdomínio) em vez de usar SEMPRE o client_id do perfil logado.
--
-- Bug: usuários cujo profiles.client_id difere do tenant que estão visualizando
-- (ex.: master vendo um subdomínio de cliente) viam o dashboard vazio, enquanto
-- o CRM — que escopa pelo tenant — mostrava os leads.
--
-- Segurança: SECURITY INVOKER + RLS. Um usuário não-master que passe um client_id
-- de outro tenant não vê nada (a RLS das tabelas filtra). Master já enxerga todos
-- os tenants por design. Portanto o escopo por parâmetro não enfraquece isolamento.
-- Param opcional (default NULL) mantém compatibilidade com chamadas sem argumento
-- (fallback pro client_id do perfil, comportamento anterior).

DROP FUNCTION IF EXISTS public.dashboard_kpis();

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_client_id text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_client_id text;
  v_pipeline_id text;
  v_result jsonb;
BEGIN
  -- Escopo pelo tenant atual quando informado; senão pelo perfil logado.
  IF p_client_id IS NOT NULL AND p_client_id <> '' THEN
    v_client_id := p_client_id;
  ELSE
    SELECT client_id INTO v_client_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object(
      'stats', jsonb_build_object(
        'total_leads', 0, 'leads_30d', 0,
        'won', 0, 'lost', 0, 'in_progress', 0, 'new_leads', 0,
        'tasks_pending', 0, 'tasks_overdue', 0
      ),
      'pipeline', '[]'::jsonb,
      'leads_by_month', '[]'::jsonb,
      'leads_by_origin', '[]'::jsonb,
      'recent_activity', '[]'::jsonb,
      'pending_tasks', '[]'::jsonb
    );
  END IF;

  SELECT pc.pipeline_id INTO v_pipeline_id
  FROM pipeline_columns pc
  JOIN leads l ON l.column_id = pc.id
  WHERE pc.client_id = v_client_id AND l.client_id = v_client_id
  GROUP BY pc.pipeline_id
  ORDER BY count(*) DESC
  LIMIT 1;

  IF v_pipeline_id IS NULL THEN
    SELECT id::text INTO v_pipeline_id
    FROM pipelines WHERE client_id = v_client_id
    ORDER BY name ASC LIMIT 1;
  END IF;

  WITH
  classified AS (
    SELECT
      pc.id AS column_id,
      pc.name,
      pc.color,
      pc."order" AS col_order,
      pc.pipeline_id,
      CASE
        WHEN pc.name ~* '(ganho|fechad|won|conclu|venda|aprovad)' THEN 'won'
        WHEN pc.name ~* '(perdid|lost|cancelad|recusad|descart)' THEN 'lost'
        WHEN pc.name ~* '(novo|entrada|new|inicio|in[ií]cio|prospec)' THEN 'new'
        ELSE 'in_progress'
      END AS state
    FROM pipeline_columns pc
    WHERE pc.client_id = v_client_id
  ),
  lead_state AS (
    SELECT l.id, l.origin, l.created_at, l.column_id, c.state
    FROM leads l
    LEFT JOIN classified c ON c.column_id = l.column_id
    WHERE l.client_id = v_client_id
  ),
  stats AS (
    SELECT
      count(*) AS total_leads,
      count(*) FILTER (WHERE created_at >= now() - INTERVAL '30 days') AS leads_30d,
      count(*) FILTER (WHERE state = 'won') AS won,
      count(*) FILTER (WHERE state = 'lost') AS lost,
      count(*) FILTER (WHERE state = 'in_progress') AS in_progress_count,
      count(*) FILTER (WHERE state = 'new') AS new_leads
    FROM lead_state
  ),
  task_stats AS (
    SELECT
      count(*) FILTER (WHERE status = 'pending') AS tasks_pending,
      count(*) FILTER (WHERE status = 'overdue') AS tasks_overdue
    FROM tasks
    WHERE client_id = v_client_id
  ),
  pipeline_summary AS (
    SELECT
      c.column_id,
      c.name,
      c.color,
      c.col_order,
      coalesce(count(l.id), 0) AS count
    FROM classified c
    LEFT JOIN lead_state l ON l.column_id = c.column_id
    WHERE c.pipeline_id = v_pipeline_id
    GROUP BY c.column_id, c.name, c.color, c.col_order
    ORDER BY c.col_order ASC
  ),
  by_month AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS key,
      to_char(date_trunc('month', created_at), 'TMmon') AS name,
      count(*) AS count
    FROM lead_state
    WHERE created_at >= now() - INTERVAL '6 months'
    GROUP BY 1, 2
    ORDER BY 1 ASC
  ),
  by_origin AS (
    SELECT
      coalesce(NULLIF(trim(origin), ''), 'Desconhecida') AS name,
      count(*) AS count
    FROM lead_state
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 7
  ),
  recent_activity AS (
    SELECT type, content, created_at, user_name
    FROM timeline_events
    WHERE client_id = v_client_id
    ORDER BY created_at DESC
    LIMIT 6
  ),
  pending_tasks AS (
    SELECT
      t.id, t.title, t.status, t.due_date,
      l.name AS lead_name,
      l.company AS lead_company
    FROM tasks t
    LEFT JOIN leads l ON l.id = t.lead_id
    WHERE t.client_id = v_client_id AND t.status != 'completed'
    ORDER BY
      CASE WHEN t.status = 'overdue' THEN 0 ELSE 1 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'stats', (SELECT jsonb_build_object(
      'total_leads', s.total_leads,
      'leads_30d', s.leads_30d,
      'won', s.won,
      'lost', s.lost,
      'in_progress', s.in_progress_count,
      'new_leads', s.new_leads,
      'tasks_pending', ts.tasks_pending,
      'tasks_overdue', ts.tasks_overdue
    ) FROM stats s, task_stats ts),
    'pipeline', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'column_id', column_id, 'name', name, 'color', color,
        'order', col_order, 'count', count
      )) FROM pipeline_summary
    ), '[]'::jsonb),
    'leads_by_month', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', key, 'name', name, 'count', count))
      FROM by_month
    ), '[]'::jsonb),
    'leads_by_origin', coalesce((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count))
      FROM by_origin
    ), '[]'::jsonb),
    'recent_activity', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'type', type, 'content', content, 'created_at', created_at, 'user_name', user_name
      ))
      FROM recent_activity
    ), '[]'::jsonb),
    'pending_tasks', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'due_date', due_date,
        'lead_name', lead_name, 'lead_company', lead_company
      ))
      FROM pending_tasks
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dashboard_kpis(text) TO authenticated, anon;
