-- ════════════════════════════════════════════════════════════════════════
-- 9999_reconcile_drift.sql — reconciliação de drift Fase 0
-- (docs/MIGRACAO_SELFHOSTED_PLAN.md)
--
-- STATUS: RASCUNHO / INCOMPLETO. Cobre só o único item de drift já
-- confirmado por evidência indireta nesta fase (ver plano, seção Fase 0 →
-- Cron jobs). O diff completo contra schema-cloud.sql ainda não foi feito
-- (dump do [OPERADOR] pendente) — este arquivo será reaberto e completado
-- quando o dump chegar. Nome fixo `9999_...` (fora da sequência de
-- timestamp das demais migrations) de propósito: sinaliza "reconciliação",
-- não uma migration de feature nova, e deve ser a ÚLTIMA a rodar na Fase 2.
--
-- Drift conhecido: o job de cron `whatsapp-queue-processor` roda em
-- produção (citado como "cron de referência já funcional" na migration
-- `20260618_automation_worker_cron_fix.sql`, usado para copiar a
-- autenticação do `automation-worker`) mas NENHUMA migration no repo o
-- cria — foi criado direto no SQL Editor/painel do cloud.
--
-- Por que este arquivo NÃO recria o job ainda: recriar um cron de produção
-- com `schedule`/`command` adivinhados é exatamente o tipo de erro que a
-- Fase 0 existe para evitar (um schedule ou header errado falha em
-- silêncio — foi o que já aconteceu com o automation-worker em
-- 2026-06-18). O valor real só se sabe rodando, no cloud, a query que já
-- está documentada no plano:
--
--   select jobid, jobname, schedule, command, active
--   from cron.job
--   order by jobname;
--
-- [OPERADOR]: colar o resultado dessa query na Fase 0 do plano. [AGENTE]:
-- na sessão seguinte, substituir o bloco abaixo por um `cron.schedule(...)`
-- real com o `schedule`/`command` confirmados (mesmo padrão idempotente das
-- migrations 20260428/20260618: remove se já existir, depois agenda).
-- ════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron não habilitado neste banco — nada a reconciliar aqui ainda.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-queue-processor'
  ) THEN
    RAISE NOTICE 'DRIFT PENDENTE DE CONFIRMACAO: job de cron "whatsapp-queue-processor" existe em producao (cloud) mas nao foi recriado aqui — schedule/command reais ainda nao confirmados pelo OPERADOR. Ver docs/MIGRACAO_SELFHOSTED_PLAN.md, Fase 0, secao Cron jobs, para a query de leitura e o proximo passo.';
  END IF;
END;
$$;
