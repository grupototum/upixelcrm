-- Add tracking for 24h message window and template usage in conversations

-- ── 1. Add fields to conversations table ────────────────────────
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS message_window_status TEXT DEFAULT 'open' CHECK (message_window_status IN ('open', 'closed', 'expired'));

-- ── 2. Index for window calculations ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_last_inbound_at ON public.conversations(last_inbound_at);
CREATE INDEX IF NOT EXISTS idx_conversations_opened_at ON public.conversations(opened_at);

-- ── 3. Trigger to update last_inbound_at when inbound message arrives ──
CREATE OR REPLACE FUNCTION public.update_last_inbound_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.conversations
    SET last_inbound_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_inbound_at ON public.messages;
CREATE TRIGGER trigger_update_last_inbound_at
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_inbound_at();

-- ── 4. Helper function: check if conversation is within 24h window ────
-- Returns TRUE if last inbound message was within the last 24 hours
CREATE OR REPLACE FUNCTION public.is_within_24h_window(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    last_inbound_at > NOW() - INTERVAL '24 hours',
    false
  )
  FROM public.conversations
  WHERE id = conv_id;
$$;

-- ── 5. Function to get remaining window time in seconds ────────────────
-- Returns seconds remaining until 24h window closes (or NULL if already closed)
CREATE OR REPLACE FUNCTION public.get_window_remaining_seconds(conv_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    EXTRACT(EPOCH FROM (last_inbound_at + INTERVAL '24 hours' - NOW()))::INTEGER,
    NULL
  )
  FROM public.conversations
  WHERE id = conv_id
    AND last_inbound_at IS NOT NULL
    AND last_inbound_at > NOW() - INTERVAL '24 hours';
$$;
