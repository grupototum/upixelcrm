-- M15: Rewrite automation_runs_summary as SECURITY INVOKER
-- Before: SECURITY DEFINER bypassed RLS of calling user
-- After: respects the caller's RLS policies; adds tenant_id to GROUP BY

DROP VIEW IF EXISTS public.automation_runs_summary;

CREATE VIEW public.automation_runs_summary
  WITH (security_invoker = true)
AS
  SELECT
    a.id          AS automation_id,
    a.tenant_id,
    a.client_id,
    count(*) FILTER (WHERE r.status = 'running')   AS running_count,
    count(*) FILTER (WHERE r.status = 'waiting')   AS waiting_count,
    count(*) FILTER (WHERE r.status = 'completed') AS completed_count,
    count(*) FILTER (WHERE r.status = 'failed')    AS failed_count,
    count(*) FILTER (WHERE r.status = 'paused')    AS paused_count,
    count(*)                                        AS total_runs,
    max(r.started_at)                               AS last_run_at
  FROM public.automations a
  LEFT JOIN public.automation_runs r ON r.automation_id = a.id
  GROUP BY a.id, a.tenant_id, a.client_id;

COMMENT ON VIEW public.automation_runs_summary IS
  'Resumo de runs por automacao. SECURITY INVOKER: respeita RLS do usuario chamador.';
