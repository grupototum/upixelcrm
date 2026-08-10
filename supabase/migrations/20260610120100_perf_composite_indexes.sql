-- Clean Up pré-produção — índices compostos para queries quentes
-- (AppContext carrega tasks/timeline filtrando por client_id + ordenando por created_at;
--  dashboard_kpis junta pipeline_columns por client_id + pipeline_id)

CREATE INDEX IF NOT EXISTS idx_tasks_client_created
  ON public.tasks (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_client_created
  ON public.timeline_events (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_columns_client_pipeline
  ON public.pipeline_columns (client_id, pipeline_id);
