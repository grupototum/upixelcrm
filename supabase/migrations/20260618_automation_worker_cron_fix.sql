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
-- Esta migration (re)agenda o `automation-worker` a cada minuto de
-- forma idempotente e SEM segredo no git, escolhendo a origem da
-- autenticação nesta ordem:
--
--   A) Se as configs de banco app.supabase_url + app.service_role_key
--      existirem, usa-as (caminho preferencial, explícito).
--   B) Senão, reaproveita a autenticação de um cron que JÁ funciona no
--      gateway (whatsapp-queue-processor), trocando apenas o path da
--      função. Assim o secret é resolvido server-side, nunca tocando o
--      repositório. (É exatamente o estado aplicado em prod hoje.)
--   C) Se nenhum dos dois existir, FALHA EM VOZ ALTA com instruções,
--      em vez de agendar um job que falharia em silêncio.
--
-- ── Opcional: tornar o caminho (A) disponível (fora do git) ──
--   ALTER DATABASE postgres SET app.supabase_url     = 'https://xusdhzwfkzufupjwbebt.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<SB_SECRET_KEY>';  -- chave sb_secret_… nova
--
-- ⚠️ O secret de edge `SUPABASE_SERVICE_ROLE_KEY` (usado por
--    automation-worker → automation-engine como Bearer) também
--    precisa ser uma chave válida no gateway — caso contrário o engine
--    retorna 401 UNAUTHORIZED_INVALID_JWT_FORMAT. Isso é setado no
--    Dashboard (Edge Functions → Secrets), não via SQL.
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
DECLARE
  job_name  TEXT := 'automation-worker';
  ref_job   TEXT := 'whatsapp-queue-processor';  -- cron de referência já funcional
  v_url     TEXT := current_setting('app.supabase_url', true);
  v_key     TEXT := current_setting('app.service_role_key', true);
  v_command TEXT;
BEGIN
  -- Remove agendamento anterior (idempotente).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
    PERFORM cron.unschedule(job_name);
  END IF;

  IF v_url IS NOT NULL AND length(v_url) > 0
     AND v_key IS NOT NULL AND length(v_key) > 0 THEN
    -- (A) configs de banco explícitas
    v_command := format(
      $f$
        SELECT net.http_post(
          url     := %L || '/functions/v1/automation-worker',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body    := '{}'::jsonb
        );
      $f$,
      v_url, v_key
    );
  ELSE
    -- (B) reaproveita a auth de um cron funcional, trocando só o path.
    --     O secret nunca aparece em texto: tudo resolvido server-side.
    SELECT replace(command, ref_job, job_name)
      INTO v_command
    FROM cron.job
    WHERE jobname = ref_job
    LIMIT 1;

    -- (C) nada disponível → falha clara.
    IF v_command IS NULL THEN
      RAISE EXCEPTION
        'Não há app.service_role_key configurado nem cron "%" de referência. Defina app.supabase_url/app.service_role_key (ver cabeçalho) antes de aplicar.',
        ref_job;
    END IF;
  END IF;

  PERFORM cron.schedule(job_name, '* * * * *', v_command);
END;
$$;

NOTIFY pgrst, 'reload schema';
