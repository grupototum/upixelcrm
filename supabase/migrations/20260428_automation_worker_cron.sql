-- ════════════════════════════════════════════════════════════
-- automation-worker scheduling via pg_cron + pg_net
--
-- Este job invoca a Edge Function `automation-worker` a cada
-- minuto para processar a fila `automation_queue` (delays,
-- retries, fluxos complexos com timer).
--
-- Sem este cron, itens pendentes ficam presos indefinidamente.
-- O frontend tem um polling de fallback (useAutomationWorker),
-- mas ele só roda enquanto há browser aberto.
-- ════════════════════════════════════════════════════════════

-- Garante que as extensões necessárias estão habilitadas.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
DECLARE
  job_name TEXT := 'automation-worker';
BEGIN
  -- Remove agendamento anterior (se existir) para evitar duplicação
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = job_name
  ) THEN
    PERFORM cron.unschedule(job_name);
  END IF;

  -- Agenda execução a cada minuto.
  -- ATENÇÃO: as configurações `app.supabase_url` e `app.service_role_key`
  -- precisam estar definidas no banco. Se ainda não estiverem,
  -- execute (substituindo pelos valores reais):
  --   ALTER DATABASE postgres SET app.supabase_url        = 'https://<PROJECT>.supabase.co';
  --   ALTER DATABASE postgres SET app.service_role_key    = '<SERVICE_ROLE_KEY>';
  PERFORM cron.schedule(
    job_name,
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url     := current_setting('app.supabase_url', true) || '/functions/v1/automation-worker',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := '{}'::jsonb
      );
    $cron$
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
