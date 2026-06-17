-- =============================================
-- CSAT (Customer Satisfaction) Survey
-- =============================================
-- Flow: conversation resolved → trigger sets csat_requested_at (5min delay)
--   → useCsatSender hook sends WhatsApp message when timer elapses
--   → inbound numeric reply (1-5) stored in csat_responses
-- =============================================

-- 1) Add CSAT columns to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS csat_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS csat_sent_at      TIMESTAMPTZ;

-- 2) CSAT responses table
CREATE TABLE IF NOT EXISTS public.csat_responses (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID      NOT NULL,
  conversation_id UUID      NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id         UUID      REFERENCES public.leads(id) ON DELETE SET NULL,
  rating          SMALLINT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  responded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csat_responses_tenant_access" ON public.csat_responses
  FOR ALL USING (get_user_client_id() = client_id OR is_master_user());

CREATE INDEX IF NOT EXISTS idx_csat_responses_client_id
  ON public.csat_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_conversation_id
  ON public.csat_responses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_responded_at
  ON public.csat_responses(client_id, responded_at);

-- 3) Trigger: schedule CSAT 5 minutes after a conversation is resolved.
--    Only schedules once (idempotent: skips if already scheduled).
CREATE OR REPLACE FUNCTION public.schedule_csat_on_resolve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'resolved'
     AND COALESCE(OLD.status, '') <> 'resolved'
     AND NEW.csat_requested_at IS NULL
  THEN
    NEW.csat_requested_at := now() + interval '5 minutes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_csat ON public.conversations;
CREATE TRIGGER trg_schedule_csat
  BEFORE UPDATE OF status ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.schedule_csat_on_resolve();

-- 4) Sparse index to efficiently find conversations with pending CSAT
CREATE INDEX IF NOT EXISTS idx_conversations_csat_pending
  ON public.conversations(client_id, csat_requested_at)
  WHERE csat_sent_at IS NULL AND csat_requested_at IS NOT NULL;

-- 5) RPC: aggregate CSAT stats for a date range
CREATE OR REPLACE FUNCTION public.csat_stats(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
) RETURNS TABLE (
  avg_rating     NUMERIC,
  total_responses BIGINT,
  rating_1       BIGINT,
  rating_2       BIGINT,
  rating_3       BIGINT,
  rating_4       BIGINT,
  rating_5       BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2)                       AS avg_rating,
    COUNT(*)                                              AS total_responses,
    COUNT(*) FILTER (WHERE rating = 1)                   AS rating_1,
    COUNT(*) FILTER (WHERE rating = 2)                   AS rating_2,
    COUNT(*) FILTER (WHERE rating = 3)                   AS rating_3,
    COUNT(*) FILTER (WHERE rating = 4)                   AS rating_4,
    COUNT(*) FILTER (WHERE rating = 5)                   AS rating_5
  FROM public.csat_responses
  WHERE client_id = get_user_client_id()
    AND responded_at >= p_start
    AND responded_at <  p_end;
$$;

GRANT EXECUTE ON FUNCTION public.csat_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- 6) Add csat_responses to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.csat_responses;
