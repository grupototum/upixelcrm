-- ════════════════════════════════════════════════════════════
-- FIX: cron `automation-worker` ausente em produção
--
-- Diagnóstico (2026-06-18):
--   • A migration 20260428_automation_worker_cron.sql nunca chegou
--     a agendar o job em produção: `cron.job` só tinha os jobs
--     whatsapp-* — NÃO havia `automation-worker`.
--   • Como ninguém drena a `automation_queue`, os itens ficaram
--     presos em `pending`/`failed` desde 21/maio e o agente SDR
--     parou de responder (o `automation-engine` nunca executa).
--   • Além disso, as configs de banco `app.supabase_url` e
--     `app.service_role_key` estavam NULL — então mesmo que o job
--     existisse, o `net.http_post` montaria uma URL nula e falharia
--     SILENCIOSAMENTE (foi o que mascarou o problema por ~1 mês).
--
-- Esta migration:
--   1. Falha EM VOZ ALTA se as configs obrigatórias não existirem
--      (em vez de agendar um job que não faz nada).
--   2. (Re)agenda o `automation-worker` a cada minuto.
--
-- ── SETUP OBRIGATÓRIO (uma vez, fora do git — NÃO commitar segredo) ──
-- Defina as configs de banco com a MESMA chave que os crons
-- whatsapp-* já usam com sucesso no gateway (verify_jwt=true):
--
--   ALTER DATABASE postgres SET app.supabase_url     = 'https://xusdhzwfkzufupjwbebt.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<SB_SECRET_KEY>';  -- chave sb_secret_… nova
--
-- ⚠️ O secret de edge `SUPABASE_SERVICE_ROLE_KEY` (usado por
--    automation-worker → automation-engine como Bearer) também
--    precisa ser essa mesma chave válida — caso contrário o engine
--    retorna 401 UNAUTHORIZED_INVALID_JWT_FORMAT. Isso é setado no
--    Dashboard (Edge Functions → Secrets), não via SQL.
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
DECLARE
  job_name     TEXT := 'automation-worker';
  v_url        TEXT := current_setting('app.supabase_url', true);
  v_key        TEXT := current_setting('app.service_role_key', true);
BEGIN
  -- 1. Guarda: não agenda um job que vai falhar silenciosamente.
  IF v_url IS NULL OR length(v_url) = 0 OR v_key IS NULL OR length(v_key) = 0 THEN
    RAISE EXCEPTION
      'app.supabase_url / app.service_role_key não configurados. Rode os ALTER DATABASE do cabeçalho desta migration antes de aplicá-la.';
  END IF;

  -- 2. Remove agendamento anterior (idempotente).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
    PERFORM cron.unschedule(job_name);
  END IF;

  -- 3. Agenda a cada minuto, espelhando o padrão dos crons whatsapp-*
  --    (Bearer resolvido em runtime a partir da config de banco;
  --     o segredo NÃO fica no git).
  PERFORM cron.schedule(
    job_name,
    '* * * * *',
    format(
      $cron$
        SELECT net.http_post(
          url     := %L || '/functions/v1/automation-worker',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body    := '{}'::jsonb
        );
      $cron$,
      v_url, v_key
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
