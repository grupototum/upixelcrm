-- ════════════════════════════════════════════════════════════════════════
-- PR 6/8 do plano de estabilidade Inbox/Bots: separar rascunho de publicado.
--
-- Antes, o botão "Salvar" gravava direto em nodes/edges — as mesmas colunas
-- que o engine lê. Editar um bot publicado alterava o comportamento em
-- produção instantaneamente, no meio de conversas reais, sem publicar e sem
-- rollback. Um nó apagado por engano derrubava o fluxo na hora.
--
-- Agora: a edição grava em draft_nodes/draft_edges e só "Publicar" copia para
-- nodes/edges. O engine continua lendo apenas nodes/edges — nenhuma mudança
-- necessária no whatsapp-webhook.
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS draft_nodes JSONB,
  ADD COLUMN IF NOT EXISTS draft_edges JSONB,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bots.draft_nodes IS
  'Rascunho em edição. NULL = sem alterações pendentes (draft == publicado). '
  'O engine SEMPRE lê nodes/edges (publicado), nunca o rascunho.';

-- Bots já publicados ganham a data de publicação a partir do último update.
UPDATE public.bots
SET published_at = COALESCE(published_at, updated_at)
WHERE status = 'published' AND published_at IS NULL;
