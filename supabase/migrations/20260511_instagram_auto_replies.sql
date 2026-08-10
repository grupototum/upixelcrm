-- Tabela de regras de resposta automática do Instagram.
-- Cobre os 3 funis: comentários por keyword, menções em story, menções em post/comentário.
-- RLS isolada por tenant (client_id) — não vaza entre clientes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.instagram_auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  tenant_id UUID,
  name TEXT NOT NULL,
  -- Tipo de gatilho que dispara a regra
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('comment', 'story_mention', 'mention')),
  -- Keyword opcional (NULL = qualquer texto bate). Só usado em trigger_type='comment'.
  keyword TEXT,
  -- Como comparar o keyword com o texto recebido
  match_mode TEXT NOT NULL DEFAULT 'contains'
    CHECK (match_mode IN ('exact', 'contains', 'starts_with', 'any')),
  -- O que fazer quando bate: enviar DM ao autor, ou responder publicamente
  reply_type TEXT NOT NULL DEFAULT 'dm'
    CHECK (reply_type IN ('dm', 'public_comment_reply')),
  reply_text TEXT NOT NULL,
  -- Limite de execuções por usuário (anti-flood). 0 = ilimitado.
  per_user_cooldown_hours INT NOT NULL DEFAULT 24,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de execuções pra cooldown anti-flood E auditoria do que o bot mandou.
CREATE TABLE IF NOT EXISTS public.instagram_auto_reply_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.instagram_auto_replies(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL, -- IGSID do destinatário
  trigger_payload JSONB,         -- snapshot do que disparou (comment_id, media_id, etc.)
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_auto_reply_executions ENABLE ROW LEVEL SECURITY;

-- Helper inline pra pegar client_id do usuário autenticado.
-- Mesmo padrão de outras tabelas do app.
CREATE POLICY "iar_select_own_tenant"
  ON public.instagram_auto_replies FOR SELECT
  USING (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "iar_insert_own_tenant"
  ON public.instagram_auto_replies FOR INSERT
  WITH CHECK (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "iar_update_own_tenant"
  ON public.instagram_auto_replies FOR UPDATE
  USING (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "iar_delete_own_tenant"
  ON public.instagram_auto_replies FOR DELETE
  USING (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()));

-- Executions: leitura por tenant; insert/update reservado ao service_role (webhook).
CREATE POLICY "iare_select_own_tenant"
  ON public.instagram_auto_reply_executions FOR SELECT
  USING (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_iar_active ON public.instagram_auto_replies (client_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_iar_trigger ON public.instagram_auto_replies (client_id, trigger_type, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_iare_lookup ON public.instagram_auto_reply_executions (rule_id, target_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_auto_replies TO authenticated;
GRANT SELECT ON public.instagram_auto_reply_executions TO authenticated;

COMMIT;
