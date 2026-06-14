-- =============================================
-- SLA tracking: populate first_reply_at and resolved_at automatically
-- + RPC for dashboard aggregates.
-- =============================================

-- 1) Trigger: set first_reply_at on the FIRST outbound message of a conversation.
CREATE OR REPLACE FUNCTION public.set_conversation_first_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.direction = 'outbound'
     AND COALESCE((NEW.metadata->>'is_private')::boolean, false) = false THEN
    UPDATE public.conversations
       SET first_reply_at = NEW.created_at
     WHERE id = NEW.conversation_id
       AND first_reply_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_conversation_first_reply ON public.messages;
CREATE TRIGGER trg_set_conversation_first_reply
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_first_reply();

-- 2) Trigger: set resolved_at when status transitions to 'resolved'; clear when
--    leaving 'resolved' (e.g. reopen). Idempotent on UPDATEs that don't change status.
CREATE OR REPLACE FUNCTION public.set_conversation_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'resolved' AND COALESCE(OLD.status, '') <> 'resolved' THEN
    NEW.resolved_at := now();
  ELSIF NEW.status <> 'resolved' AND COALESCE(OLD.status, '') = 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_conversation_resolved_at ON public.conversations;
CREATE TRIGGER trg_set_conversation_resolved_at
BEFORE UPDATE OF status ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_resolved_at();

-- 3) RPC: aggregated SLA metrics for the current tenant in a date range.
CREATE OR REPLACE FUNCTION public.sla_metrics(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_conversations       BIGINT,
  resolved_conversations    BIGINT,
  open_conversations        BIGINT,
  pending_conversations     BIGINT,
  snoozed_conversations     BIGINT,
  avg_first_reply_seconds   NUMERIC,
  median_first_reply_seconds NUMERIC,
  avg_resolution_seconds    NUMERIC,
  median_resolution_seconds NUMERIC,
  conversations_with_reply  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client TEXT;
  v_is_master BOOLEAN;
  v_start TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
BEGIN
  v_client    := public.get_user_client_id();
  v_is_master := public.is_master_user();
  v_start     := COALESCE(p_start, now() - INTERVAL '30 days');
  v_end       := COALESCE(p_end, now());

  RETURN QUERY
  WITH scoped AS (
    SELECT c.*
      FROM public.conversations c
     WHERE (v_is_master OR c.client_id = v_client)
       AND c.created_at BETWEEN v_start AND v_end
  ),
  reply_secs AS (
    SELECT EXTRACT(EPOCH FROM (first_reply_at - created_at)) AS s
      FROM scoped
     WHERE first_reply_at IS NOT NULL
  ),
  resolution_secs AS (
    SELECT EXTRACT(EPOCH FROM (resolved_at - created_at)) AS s
      FROM scoped
     WHERE resolved_at IS NOT NULL
  )
  SELECT
    (SELECT COUNT(*) FROM scoped),
    (SELECT COUNT(*) FROM scoped WHERE status = 'resolved'),
    (SELECT COUNT(*) FROM scoped WHERE status = 'open'),
    (SELECT COUNT(*) FROM scoped WHERE status = 'pending'),
    (SELECT COUNT(*) FROM scoped WHERE status = 'snoozed'),
    (SELECT AVG(s)::NUMERIC FROM reply_secs),
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY s)::NUMERIC FROM reply_secs),
    (SELECT AVG(s)::NUMERIC FROM resolution_secs),
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY s)::NUMERIC FROM resolution_secs),
    (SELECT COUNT(*) FROM reply_secs);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sla_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 4) Helper: per-agent breakdown (assignee from metadata)
CREATE OR REPLACE FUNCTION public.sla_metrics_by_agent(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  agent_id TEXT,
  total_conversations BIGINT,
  resolved_conversations BIGINT,
  avg_first_reply_seconds NUMERIC,
  avg_resolution_seconds NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client TEXT;
  v_is_master BOOLEAN;
  v_start TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
BEGIN
  v_client    := public.get_user_client_id();
  v_is_master := public.is_master_user();
  v_start     := COALESCE(p_start, now() - INTERVAL '30 days');
  v_end       := COALESCE(p_end, now());

  RETURN QUERY
  SELECT
    COALESCE(c.metadata->>'assignee_id', 'unassigned') AS agent_id,
    COUNT(*)::BIGINT AS total_conversations,
    COUNT(*) FILTER (WHERE c.status = 'resolved')::BIGINT AS resolved_conversations,
    AVG(EXTRACT(EPOCH FROM (c.first_reply_at - c.created_at)))::NUMERIC AS avg_first_reply_seconds,
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)))::NUMERIC AS avg_resolution_seconds
  FROM public.conversations c
  WHERE (v_is_master OR c.client_id = v_client)
    AND c.created_at BETWEEN v_start AND v_end
  GROUP BY 1
  ORDER BY total_conversations DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sla_metrics_by_agent(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 5) Backfill first_reply_at on existing conversations using earliest outbound
UPDATE public.conversations c
SET first_reply_at = sub.first_out
FROM (
  SELECT m.conversation_id, MIN(m.created_at) AS first_out
    FROM public.messages m
   WHERE m.direction = 'outbound'
     AND COALESCE((m.metadata->>'is_private')::boolean, false) = false
   GROUP BY m.conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.first_reply_at IS NULL;

-- 6) Backfill resolved_at = updated_at where status='resolved' and resolved_at is null
UPDATE public.conversations
   SET resolved_at = updated_at
 WHERE status = 'resolved'
   AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_first_reply_at ON public.conversations(first_reply_at);
CREATE INDEX IF NOT EXISTS idx_conversations_resolved_at ON public.conversations(resolved_at);
