-- ─────────────────────────────────────────────────────────────
-- WhatsApp Multi-Instance & Constraint Fixes
-- ─────────────────────────────────────────────────────────────

-- 1. Fix conversations.channel constraint (add whatsapp_official)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_channel_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_channel_check
  CHECK (channel IN ('whatsapp', 'whatsapp_official', 'email', 'instagram', 'webchat'));

-- 2. Fix messages.type constraint (add video, sticker, document, location, contact)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text', 'audio', 'image', 'video', 'file', 'document', 'sticker', 'location', 'contact', 'email'));

-- 3. Add integration_id to conversations (tracks which WA instance)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_integration_id
  ON public.conversations (integration_id);

-- 4. Add instance_name column to integrations for multi-instance support
ALTER TABLE public.integrations ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- Backfill instance_name from config JSONB
UPDATE public.integrations
  SET instance_name = config->>'instance_name'
  WHERE config->>'instance_name' IS NOT NULL
    AND instance_name IS NULL;

-- 5. Drop the old single-instance unique constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_client_id_provider_key;

-- 6. New unique index: allows multiple instances per (client_id, provider)
--    using COALESCE so non-WhatsApp providers (no instance_name) still get unique enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_client_provider_instance
  ON public.integrations (client_id, provider, COALESCE(instance_name, ''));

-- 7. Index for fast multi-instance lookups
CREATE INDEX IF NOT EXISTS idx_integrations_client_provider
  ON public.integrations (client_id, provider);

CREATE INDEX IF NOT EXISTS idx_integrations_instance_name
  ON public.integrations (provider, instance_name)
  WHERE instance_name IS NOT NULL;
