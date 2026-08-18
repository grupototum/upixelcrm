-- Suporte ao tipo de evento "call_attempt" (tentativa de ligação sem atendimento).
-- Distinto de "call" (conversa efetiva).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%timeline_events_type%'
  ) THEN
    ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_type_check;
    ALTER TABLE timeline_events ADD CONSTRAINT timeline_events_type_check
      CHECK (type IN (
        'message','stage_change','note','task','automation',
        'call','call_attempt','meeting','field_changed'
      ));
  END IF;
END$$;

-- Também expande goals_metric_check para incluir call_attempts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%goals_metric_check%'
  ) THEN
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_metric_check;
    ALTER TABLE goals ADD CONSTRAINT goals_metric_check
      CHECK (metric IN (
        'leads_created','tasks_completed','contacts_made','leads_closed',
        'calls_made','call_attempts','meetings_done'
      ));
  END IF;
END$$;

-- Índice para consultas de progresso de meta
CREATE INDEX IF NOT EXISTS idx_timeline_events_call_attempt
  ON timeline_events (client_id, user_id, type, created_at)
  WHERE type = 'call_attempt';
