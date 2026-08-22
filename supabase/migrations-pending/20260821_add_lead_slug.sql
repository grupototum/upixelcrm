-- PARKED em 2026-08-21 aguardando "aprovado, aplica em prod" literal do Rael.
-- Motivo: evitar aplicação acidental via supabase db push cego.
-- Pra aplicar: mover de volta pra supabase/migrations/ + rodar apply explícito com backup.

-- ═══════════════════════════════════════════════════════════════════════════
-- Link amigável para leads — passo 1 de 3 (coluna + índice)
--
-- Spec completa: SPEC-LEAD-SLUG.md (raiz do repo).
--
-- ⚠️  NÃO APLICADA. Esta migration vive numa branch fora de `main` de propósito,
--     para não entrar em prod junto de um deploy comum. Só aplicar depois de
--     aprovação explícita.
--
-- Escopo deste arquivo, e só isto:
--   - adiciona leads.slug como NULLABLE
--   - cria índice único parcial (ignora linhas com slug null)
--
-- O que este arquivo NÃO faz, de propósito:
--   - backfill dos leads existentes  -> passo 2, job em lote separado
--   - tornar slug NOT NULL           -> passo 3, migration própria, só depois
--                                       do backfill confirmado em 100%
--   - qualquer alteração de RLS, policy, trigger ou grant
--
-- Por que nullable primeiro: tornar NOT NULL antes do backfill quebra todo
-- INSERT de lead novo enquanto a geração de slug ainda não existe no código.
--
-- ─── Como aplicar (só quando aprovado) ────────────────────────────────────
--   1. Backup manual da tabela leads.
--   2. git checkout fix/lead-slug
--   3. supabase db push        (ou aplicar este SQL pelo painel)
--   4. Conferir:  select count(*) from leads where slug is not null;  -- deve ser 0
--
-- ─── Rollback ─────────────────────────────────────────────────────────────
--   drop index if exists public.leads_slug_unique_idx;
--   alter table public.leads drop column if exists slug;
--
--   Seguro enquanto nenhum código estiver lendo a coluna: até o passo 4 da
--   spec (resolução da rota) nada no frontend referencia `slug`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.leads
  add column if not exists slug text;

comment on column public.leads.slug is
  'Identificador legível para URL (/leads/<slug>). Gerado como slugify(name) + "-" + hash curto do id. Nullable até o backfill completar — ver SPEC-LEAD-SLUG.md.';

-- Parcial (where slug is not null): permite convivência de linhas com e sem
-- slug durante o backfill, sem que os nulls disputem unicidade entre si.
create unique index if not exists leads_slug_unique_idx
  on public.leads (slug)
  where slug is not null;
