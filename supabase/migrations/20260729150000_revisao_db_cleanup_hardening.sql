-- Revisão Totum 2026-07-29 — limpeza e hardening do banco (aprovado pelo operador).
--
-- 1) Remove tabelas de backup/debug órfãs (advisors rls_enabled_no_policy):
--    _evo_key_bak_20260619 e _evo_url_bak_20260619 (backups de secrets de jun/19),
--    _f11_backfill_bak_conv/_msg (backup do backfill F11) e whatsapp_webhook_debug
--    (vazia). Nenhuma é referenciada no código.
-- 2) Remove meta_deauthorization_events E meta_deauthorize_events: tabelas
--    duplicadas, ambas vazias e sem nenhuma referência em src/ ou
--    supabase/functions/.
-- 3) Fixa search_path em schedule_csat_on_resolve (advisor
--    function_search_path_mutable), como já feito para as demais em 20260610120000.
-- 4) Revoga EXECUTE de csat_stats do anon (advisor
--    anon_security_definer_function_executable) — só o dashboard autenticado usa.

DROP TABLE IF EXISTS public._evo_key_bak_20260619;
DROP TABLE IF EXISTS public._evo_url_bak_20260619;
DROP TABLE IF EXISTS public._f11_backfill_bak_conv;
DROP TABLE IF EXISTS public._f11_backfill_bak_msg;
DROP TABLE IF EXISTS public.whatsapp_webhook_debug;
DROP TABLE IF EXISTS public.meta_deauthorization_events;
DROP TABLE IF EXISTS public.meta_deauthorize_events;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'schedule_csat_on_resolve'
  ) THEN
    EXECUTE (
      SELECT format('ALTER FUNCTION %s SET search_path TO ''public''', p.oid::regprocedure)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'schedule_csat_on_resolve' LIMIT 1
    );
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.csat_stats(timestamptz, timestamptz) FROM anon;
