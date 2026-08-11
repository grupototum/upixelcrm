-- ════════════════════════════════════════════════════════════════════════
-- Ponytail audit (2026-08-11): remove schema morto — zero linhas em
-- produção, zero leituras/escritas em src/ e supabase/functions/ (grep
-- confirmado antes do drop). `broadcast_lists` nunca chegou a ser aplicada
-- em produção (a migration original 20260424_advanced_features.sql existe
-- só no repo) — o DROP TABLE IF EXISTS cobre os dois ambientes sem erro.
-- ════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.webhook_deliveries;
DROP TABLE IF EXISTS public.sequence_enrollments;
DROP TABLE IF EXISTS public.broadcast_lists;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS completed_by;
