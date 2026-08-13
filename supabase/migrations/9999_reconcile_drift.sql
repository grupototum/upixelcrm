-- ════════════════════════════════════════════════════════════════════════
-- 9999_reconcile_drift.sql — reconciliação de drift Fase 0
-- (docs/MIGRACAO_SELFHOSTED_PLAN.md)
--
-- STATUS: item `whatsapp-queue-processor` CONFIRMADO via MCP do Supabase
-- (`select * from cron.job`, sessão 2026-08-13) — schedule e command reais,
-- não mais adivinhados. O diff completo contra schema-cloud.sql (outros
-- itens de drift) ainda não foi feito — este arquivo cobre só este job.
-- Nome fixo `9999_...` (fora da sequência de timestamp das demais
-- migrations) de propósito: sinaliza "reconciliação", não uma migration de
-- feature nova, e deve ser a ÚLTIMA a rodar na Fase 2.
--
-- Drift original: o job `whatsapp-queue-processor` roda em produção desde
-- antes deste repo existir — criado direto no SQL Editor/painel do cloud,
-- nenhuma migration o criava. É o próprio "cron de referência já
-- funcional" que a migration `20260618_automation_worker_cron_fix.sql` usa
-- para copiar autenticação de outros jobs — por isso, ao contrário
-- daquele, este NÃO tem de quem copiar (seria circular). Precisa da
-- config de banco explícita (caminho A abaixo).
--
-- Confirmado em produção (2026-08-13): schedule = '*/2 * * * *',
-- command = net.http_post para .../functions/v1/whatsapp-queue-processor
-- com um Bearer token fixo no header. O secret NUNCA é reproduzido aqui —
-- resolvido em runtime via app.service_role_key (ver bloco abaixo).
--
-- ── Pré-requisito (fora do git, rodar manualmente antes desta migration) ──
--   ALTER DATABASE postgres SET app.supabase_url     = 'https://xusdhzwfkzufupjwbebt.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<SB_SECRET_KEY>';
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

DO $$
DECLARE
  job_name  TEXT := 'whatsapp-queue-processor';
  v_url     TEXT := current_setting('app.supabase_url', true);
  v_key     TEXT := current_setting('app.service_role_key', true);
  v_command TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron não habilitado neste banco — nada a reconciliar aqui ainda.';
    RETURN;
  END IF;

  IF v_url IS NULL OR length(v_url) = 0 OR v_key IS NULL OR length(v_key) = 0 THEN
    RAISE EXCEPTION
      'Não há app.supabase_url/app.service_role_key configurados. Defina-os (ver cabeçalho deste arquivo) antes de aplicar — sem isso o job "%" não pode ser recriado sem expor o secret no git.',
      job_name;
  END IF;

  -- Remove agendamento anterior (idempotente).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
    PERFORM cron.unschedule(job_name);
  END IF;

  v_command := format(
    $f$
      SELECT net.http_post(
        url     := %L || '/functions/v1/whatsapp-queue-processor',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body    := '{}'::jsonb
      );
    $f$,
    v_url, v_key
  );

  PERFORM cron.schedule(job_name, '*/2 * * * *', v_command);
END;
$$;

NOTIFY pgrst, 'reload schema';
