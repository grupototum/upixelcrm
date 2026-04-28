-- ============================================================================
-- WhatsApp Queue & Message Processing
-- ============================================================================
-- Fila robusta para processamento de mensagens WhatsApp em background
-- Garante que mensagens são processadas mesmo com falhas temporárias

CREATE TABLE IF NOT EXISTS public.whatsapp_message_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT        NOT NULL,
  conversation_id UUID        REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_data    JSONB       NOT NULL, -- raw message from WhatsApp
  source          TEXT        NOT NULL, -- 'evolution' | 'official'
  status          TEXT        NOT NULL DEFAULT 'pending',
                  -- 'pending' | 'processing' | 'completed' | 'failed'
  attempt_count   INTEGER     NOT NULL DEFAULT 0,
  max_attempts    INTEGER     NOT NULL DEFAULT 5,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON public.whatsapp_message_queue(status)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_client ON public.whatsapp_message_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created ON public.whatsapp_message_queue(created_at);

-- Tabela para rastrear duplicatas de mensagens
CREATE TABLE IF NOT EXISTS public.whatsapp_message_dedup (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT        NOT NULL,
  whatsapp_msg_id TEXT        NOT NULL, -- ID único da mensagem no WhatsApp
  source          TEXT        NOT NULL, -- 'evolution' | 'official'
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(client_id, whatsapp_msg_id, source)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_dedup_msg_id ON public.whatsapp_message_dedup(whatsapp_msg_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_dedup_client ON public.whatsapp_message_dedup(client_id);
-- Cleanup old dedup records after 7 days
CREATE INDEX IF NOT EXISTS idx_whatsapp_dedup_old ON public.whatsapp_message_dedup(processed_at)
  WHERE processed_at < now() - interval '7 days';

-- ─── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_dedup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Queue isolation" ON public.whatsapp_message_queue;
CREATE POLICY "Queue isolation"
  ON public.whatsapp_message_queue FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Dedup isolation" ON public.whatsapp_message_dedup;
CREATE POLICY "Dedup isolation"
  ON public.whatsapp_message_dedup FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── Updated timestamps ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_whatsapp_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_queue_updated_at ON public.whatsapp_message_queue;
CREATE TRIGGER trg_whatsapp_queue_updated_at
  BEFORE UPDATE ON public.whatsapp_message_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_queue_updated_at();

-- ─── Integration Status tracking ────────────────────────────────────────
-- Adiciona columns de heartbeat para verificar saúde das integrações
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='integrations' AND column_name='last_heartbeat') THEN
    ALTER TABLE public.integrations ADD COLUMN last_heartbeat TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='integrations' AND column_name='consecutive_failures') THEN
    ALTER TABLE public.integrations ADD COLUMN consecutive_failures INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='integrations' AND column_name='health_status') THEN
    ALTER TABLE public.integrations ADD COLUMN health_status TEXT DEFAULT 'unknown';
  END IF;
END $$;
