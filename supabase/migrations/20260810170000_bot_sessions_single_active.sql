-- ════════════════════════════════════════════════════════════════════════
-- PR 4/8 do plano de estabilidade Inbox/Bots: uma sessão ativa por lead.
--
-- Sem esta constraint, duas mensagens em rajada (o caso comum no WhatsApp)
-- geravam duas invocações concorrentes do webhook, ambas liam a mesma sessão
-- e ambas executavam o mesmo ramo. Pior: com 2 sessões `active` o
-- `.maybeSingle()` do engine passava a devolver erro, o código lia
-- `session = null` e criava uma TERCEIRA sessão pelo caminho de keyword —
-- espiral que só parava com intervenção manual.
--
-- O lock otimista no engine (whatsapp-webhook/index.ts) cobre a corrida de
-- avanço do ponteiro; este índice cobre a corrida de criação.
-- ════════════════════════════════════════════════════════════════════════

-- Fecha sessões duplicadas pré-existentes antes de criar o índice: mantém a
-- mais recente por lead e marca as demais como substituídas (não deleta —
-- exclusão de dados é No-Fly Zone).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY created_at DESC) AS rn
  FROM public.bot_sessions
  WHERE status = 'active'
)
UPDATE public.bot_sessions s
SET status = 'superseded', updated_at = NOW()
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_sessions_one_active_per_lead
  ON public.bot_sessions (lead_id)
  WHERE status = 'active';
