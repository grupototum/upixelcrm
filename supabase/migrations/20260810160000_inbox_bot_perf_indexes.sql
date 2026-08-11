-- ════════════════════════════════════════════════════════════════════════
-- PR 1/8 do plano de estabilidade Inbox/Bots (2026-08-10): índices dos hot
-- paths identificados no raio-X. Migration só-índice — aditiva, sem mudança
-- de comportamento, seguro de aplicar antes de qualquer mudança de código.
--
-- Sem isso: toda mensagem inbound faz seq scan em `conversations` (lookup
-- por metadata->>'phone') e a Meta manda ~3 eventos de status por mensagem
-- outbound, cada um fazendo seq scan em `messages` (lookup por
-- metadata->>'meta_message_id'). `bot_sessions` (tabela em drift — ver
-- 9999_reconcile_drift.sql, mesmo padrão já aceito no `whatsapp_message_queue`
-- de 20260619120000_sdr_route.sql) não tem nenhum índice: toda mensagem lê
-- (lead_id, status) em full scan.
-- ════════════════════════════════════════════════════════════════════════

-- Lista de conversas do Inbox: ORDER BY last_message_at DESC filtrado por
-- tenant. Só existia idx_conversations_client_id (sem a coluna de ordenação).
CREATE INDEX IF NOT EXISTS idx_conversations_client_last_msg
  ON public.conversations (client_id, last_message_at DESC);

-- Lookup de conversa por telefone (upsertConversationAndMessage nos 4
-- webhooks + whatsapp-proxy) — hoje é seq scan a cada mensagem.
CREATE INDEX IF NOT EXISTS idx_conversations_metadata_phone
  ON public.conversations ((metadata ->> 'phone'));

-- Timeline de uma conversa: já existiam índices separados em conversation_id
-- e created_at: o composto evita juntar dois index scans no caminho quente
-- de listMessagesByConversationIds.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

-- Dedupe/lookup de status por id externo da mensagem. Cobre os 3 formatos
-- em uso: meta_message_id (Cloud API / echoes / status callbacks — Meta
-- manda delivered+read+sent por mensagem outbound), mid (Messenger/Instagram)
-- e whatsapp_message_id (Evolution/Baileys, gravado mas nunca consultado
-- hoje — vira a chave de dedupe do PR de idempotência).
CREATE INDEX IF NOT EXISTS idx_messages_meta_message_id
  ON public.messages ((metadata ->> 'meta_message_id'))
  WHERE metadata ->> 'meta_message_id' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_mid
  ON public.messages ((metadata ->> 'mid'))
  WHERE metadata ->> 'mid' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id
  ON public.messages ((metadata ->> 'whatsapp_message_id'))
  WHERE metadata ->> 'whatsapp_message_id' IS NOT NULL;

-- bot_sessions: tabela em drift (não criada por nenhuma migration — só
-- ALTER, mesmo padrão de whatsapp_message_queue). Hot path do engine
-- (runBotEngine em whatsapp-webhook) filtra por (lead_id, status) sem
-- índice nenhum hoje.
ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bot_sessions_lead_status
  ON public.bot_sessions (lead_id, status);

COMMENT ON COLUMN public.bot_sessions.expires_at IS
  'Sessão vira expirada (tratada como completed) após este horário. '
  'NULL = sem timeout definido (comportamento legado). Populado a partir '
  'do PR de lock+expiry do bot engine — ver plano de estabilidade Inbox/Bots.';
