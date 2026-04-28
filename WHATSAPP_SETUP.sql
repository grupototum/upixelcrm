-- ============================================================================
-- WhatsApp Background Jobs Setup
-- ============================================================================
-- Execute este script no Supabase SQL Editor para configurar cron jobs
-- que processam a fila de mensagens e monitoram a saúde das integrações
--
-- Requisitos:
-- 1. Extensão pg_cron deve estar habilitada
-- 2. Edge Functions devem estar deployadas:
--    - supabase/functions/whatsapp-queue-processor/index.ts
--    - supabase/functions/whatsapp-health-check/index.ts

-- ─── 1. Criar extensão pg_cron (se não existir) ──────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── 2. Schedule WhatsApp Queue Processor ────────────────────────────────
-- Processa mensagens da fila a cada 2 minutos
-- Ajuste '*/2 * * * *' conforme necessário:
--   '* * * * *'       = a cada minuto (rápido, mais custoso)
--   '*/2 * * * *'     = a cada 2 minutos (recomendado)
--   '*/5 * * * *'     = a cada 5 minutos (mais econômico)

SELECT cron.schedule(
  'whatsapp-queue-processor',
  '*/2 * * * *',  -- a cada 2 minutos
  'SELECT
    net.http_post(
      url := current_setting(''app.supabase_url'') || ''/functions/v1/whatsapp-queue-processor'',
      headers := jsonb_build_object(
        ''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''),
        ''Content-Type'', ''application/json''
      ),
      body := ''{}''::jsonb
    ) as request_id;'
);

-- ─── 3. Schedule WhatsApp Health Check ────────────────────────────────
-- Monitora saúde das integrações a cada 5 minutos

SELECT cron.schedule(
  'whatsapp-health-check',
  '*/5 * * * *',  -- a cada 5 minutos
  'SELECT
    net.http_post(
      url := current_setting(''app.supabase_url'') || ''/functions/v1/whatsapp-health-check'',
      headers := jsonb_build_object(
        ''Authorization'', ''Bearer '' || current_setting(''app.service_role_key''),
        ''Content-Type'', ''application/json''
      ),
      body := ''{}''::jsonb
    ) as request_id;'
);

-- ─── 4. Auto-cleanup de mensagens duplicadas antigas ─────────────────────
-- Remove registros de deduplicação com mais de 7 dias

SELECT cron.schedule(
  'whatsapp-dedup-cleanup',
  '0 2 * * *',  -- diariamente às 2 da manhã UTC
  'DELETE FROM whatsapp_message_dedup
   WHERE processed_at < now() - interval ''7 days'';'
);

-- ─── 5. Cleanup de filas com falha permanente ───────────────────────────
-- Arquiva itens que falharam permanentemente (opcional)

SELECT cron.schedule(
  'whatsapp-queue-archive',
  '0 3 * * *',  -- diariamente às 3 da manhã UTC
  'UPDATE whatsapp_message_queue
   SET status = ''archived''
   WHERE status = ''failed''
   AND updated_at < now() - interval ''24 hours'';'
);

-- ─── 6. Verificar agendamentos ───────────────────────────────────────────
-- Query para listar todos os jobs agendados

SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
ORDER BY jobid;

-- ─── 7. Monitorar execução de jobs ─────────────────────────────────────
-- Query para ver histórico de execuções e erros

SELECT
  jobid,
  jobname,
  run_start,
  run_status,
  database,
  username
FROM cron.job_run_details
ORDER BY run_start DESC
LIMIT 20;

-- ─── 8. Desabilitar/Reabilitar jobs conforme necessário ─────────────────

-- Desabilitar um job (mantém a configuração):
-- SELECT cron.unschedule('whatsapp-queue-processor');

-- Reabilitar (recriar o job):
-- SELECT cron.schedule(
--   'whatsapp-queue-processor',
--   '*/2 * * * *',
--   'SELECT ...'
-- );

-- ============================================================================
-- Notas de Operação
-- ============================================================================

-- 1. MONITORAMENTO
--    Acesse Supabase Dashboard → SQL Editor → rodar queries de verificação
--    para monitorar execução dos cron jobs

-- 2. AJUSTAR FREQUÊNCIA
--    - Aumentar frequência se há muitas mensagens acumulando (mudar */5 para */2)
--    - Diminuir frequência se bills estão altos (mudar */2 para */5)

-- 3. ALERTAS
--    Configure alertas em seu sistema de monitoramento baseado em:
--    - whatsapp_message_queue status='failed'
--    - integration health_status != 'healthy'
--    - cron.job_run_details com run_status != 'succeeded'

-- 4. TROUBLESHOOTING
--    Se jobs não estão rodando:
--    a) Verificar se pg_cron está habilitado
--    b) Verificar se service_role_key está acessível
--    c) Verificar logs da Edge Function (Supabase Dashboard → Functions)
--    d) Verificar cron.job_run_details para erros

-- 5. ENVIRONMENT VARIABLES
--    As variáveis de ambiente necessárias estão em:
--    - app.supabase_url (configurada automaticamente)
--    - app.service_role_key (configure com: ALTER DATABASE postgres SET app.service_role_key = 'seu-key')
