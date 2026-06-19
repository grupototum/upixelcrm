-- =============================================
-- SDR pilot route on whatsapp_message_queue (shadow-safe)
-- =============================================
-- Conversas marcadas como piloto-SDR (tag 'sdr-pilot' no tenant Totum) são
-- enfileiradas com route='sdr' pelo edge whatsapp-webhook e consumidas por um
-- serviço externo na VPS. Itens normais do salesbot mantêm route='salesbot'
-- (default), preservando 100% o comportamento atual.
-- =============================================

-- 1) Coluna de rota. Default 'salesbot' garante que linhas existentes/novas
--    do fluxo atual continuem sendo processadas pelo cron whatsapp-queue-processor.
ALTER TABLE public.whatsapp_message_queue
  ADD COLUMN IF NOT EXISTS route text NOT NULL DEFAULT 'salesbot';

-- 2) Índice parcial para o consumidor (cron salesbot e serviço SDR) localizar
--    pendentes por rota sem varrer a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_waq_pending_route
  ON public.whatsapp_message_queue (status, route)
  WHERE status = 'pending';
