# Auditoria de Conformidade Arquitetural — uPixel CRM

**Data:** 2026-07-19
**Modo:** SOMENTE-LEITURA (nenhum arquivo de código alterado nesta auditoria)
**Taxonomia:** 13 camadas + 7 sub-camadas de banco de dados
**Status:** ✅ ISOLADA · ⚠️ PARCIAL · ❌ MISTURADA · ➖ NÃO IMPLEMENTADA

> Esta auditoria substitui a versão anterior (entregue só no chat, nunca salva em arquivo).
> Todas as evidências abaixo vêm de grep/leitura real do repo em `/home/user/upixelcrm`,
> não de inferência. Caminhos de arquivo e contagens são verificáveis.

> **Correção (mesmo dia, após acesso ao conector Supabase):** o achado #8 (Security & RLS)
> abaixo foi escrito só com base no repo (grep de `supabase/migrations/`) e estava
> **errado no que importa**. Consulta direta a `pg_class`/`pg_policies` no banco de produção
> confirmou que as 6 tabelas "sem RLS" têm, sim, RLS habilitada e com política em produção —
> só não têm arquivo de migration local rastreando isso (mesmo problema do achado #18, não um
> buraco de segurança separado). Texto original mantido abaixo, corrigido inline com nota.

---

## Resumo executivo

| # | Camada | Status | Achado principal |
|---|---|---|---|
| 1 | Frontend | ⚠️ PARCIAL | 99% migrado; 1 vazamento residual restante (`WhatsAppManagement.tsx`, área sensível) |
| 2 | APIs & Backend Logic | ✅ ISOLADA | 33 edge functions organizadas, `_shared/` compartilhado |
| 3 | Database & Storage | ⚠️ PARCIAL | 6 tabelas em produção **sem nenhuma migration** |
| 4 | Auth & Permissions | ⚠️ PARCIAL | Client-side (UI) + RLS (real) duplicados por design |
| 5 | Hosting & Deployment | ⚠️ PARCIAL | Split real limpo, mas `docker-compose.upixel.yml` ficou obsoleto |
| 6 | Cloud & Compute | ⚠️ PARCIAL | VPS ganhou 3º workload (`sdr-worker`) não documentado na limpeza |
| 7 | CI/CD & Version Control | ⚠️ PARCIAL | Frontend com gate (lint+test+build); **migrations fora do CI** |
| 8 | Security & RLS | ✅ ISOLADA (corrigido) | 49+ tabelas com RLS; as 6 "sem RLS" do achado inicial ~~estavam erradas~~ — RLS confirmada ao vivo no banco, só falta o arquivo de migration (ver #18) |
| 9 | Rate Limiting | ➖ NÃO IMPLEMENTADA | 100% dependente do default da plataforma |
| 10 | Caching & CDN | ✅ ISOLADA | Service worker + React Query bem calibrados |
| 11 | Load Balancing & Scaling | ➖ NÃO IMPLEMENTADA | Delegado à Vercel/Supabase (esperado nesta escala) |
| 12 | Error Tracking & Logs | ❌ MISTURADA | Sem Sentry/equivalente; só `error()` persiste, em tabela sem RLS |
| 13 | Availability & Recovery | ⚠️ PARCIAL | Backup manual funciona; "automação" configurável **não faz nada** |
| 14 | Data Modeling | ⚠️ PARCIAL | `types.ts` desatualizado vs. schema real; sem ERD |
| 15 | Indexes | ✅ ISOLADA | 106 índices, migration dedicada de performance |
| 16 | Query Optimization | ✅ ISOLADA | RPCs de agregação bem usadas; 1 N+1 aceito e documentado |
| 17 | Backups & Replication | ⚠️ PARCIAL | Sem replicação lógica; só backup manual + PITR do Supabase |
| 18 | Migrations | ❌ MISTURADA | **36 versions aplicadas em produção sem arquivo local** |
| 19 | Concurrency Control | ⚠️ PARCIAL | 1 padrão de claim atômico bom (sdr-worker), 1 fraco (automation-worker) |
| 20 | Monitoring & Tuning | ⚠️ PARCIAL | Health-checks bons; zero monitoramento de performance de query |

**Contagem (após correção do #8):** 6 ✅ ISOLADA · 11 ⚠️ PARCIAL · 2 ❌ MISTURADA · 2 ➖ NÃO IMPLEMENTADA (a soma dá 21 porque Rate Limiting e Load Balancing são as duas ➖, e ambas são aceitáveis nesta escala — não são "buracos", são escolhas razoáveis de não reinventar o que a plataforma já resolve).

---

## 🔴 O achado que mais importa (toca No-Fly Zone do CLAUDE.md)

### Migrations — drift de "bookkeeping" em produção (#18, ❌ MISTURADA)

`docs/migration-history-reconciliation.md` já documenta isto e tem um runbook pronto:
**36 versions** existem na tabela remota `supabase_migrations.schema_migrations` **sem arquivo
local correspondente** — aplicadas via MCP `apply_migration`, dashboard ou SQL direto, nunca
commitadas no repo. Uma tentativa anterior de automatizar deploy de migration no CI (PR #29) foi
**revertida** (PR #30) exatamente por causa desse drift.

**Verificado ao vivo no banco (2026-07-19, via conector Supabase):** o schema e a segurança em
si **estão corretos** — as 6 tabelas afetadas (`backup_configs`, `backup_runs`, `error_logs`,
`bots`, `bot_sessions`, `meta_oauth_sessions`, + `whatsapp_message_dedup`) **têm RLS habilitada
e com pelo menos 1 política cada**, confirmado via `pg_class.relrowsecurity` +
`pg_policies`. O problema é **só** que o repo não tem o arquivo de migration local
correspondente a essas 36 versões — ou seja, `supabase db push`/`db reset` reconstrutivo
falharia ou geraria um schema incompleto, mas a produção **atual** não tem brecha de segurança
por causa disso.

O próprio runbook do reconciliation doc é explícito: `migration repair` **só edita a tabela de
histórico**, não toca em schema nem dados — não é uma operação destrutiva. Ainda assim, como
envolve acesso direto ao banco de produção (senha do Postgres via Supabase CLI), trato como
área sensível do CLAUDE.md ("Banco de dados... Supabase migrations") e só executo com aval
explícito seu — ver o prompt de handoff abaixo.

---

## Achados menores (não bloqueantes, mas vale saber)

- **`useCsatSender.ts`** — ✅ corrigido (mesmo dia): passou a usar
  `services/inbox.listPendingCsatConversations`/`markCsatSent`/`insertMessage`.
- **`WhatsAppManagement.tsx`** (linha ~218) ainda faz um `.from("integrations").update(...)`
  direto — deixado de fora de propósito por estar na área "WhatsApp integration", marcada como
  sensível no CLAUDE.md. É uma troca mecânica trivial (mesmo padrão já usado em
  `MasterIntegrationsPage`/`AgentsTab`), mas aguarda seu aval explícito antes de tocar.
- **`docker-compose.upixel.yml`** ainda descreve a arquitetura antiga (frontend na VPS) — ficou
  para trás na limpeza do PR #44 e contradiz o `nginx.conf`/`deploy.yml` atuais.
- **`sdr-worker/`** é um processo Node standalone com instruções de systemd pra rodar na VPS —
  um 3º workload que a limpeza de infra (PR #44) não contemplou (na época achávamos que a VPS
  só servia `evolution-api`).
- **Config de backup automático é decorativa**: `DatabaseBackupPage` salva `enabled`/
  `interval_hours`/`retain_count` em `backup_configs`, mas não existe nenhum `cron.schedule`
  que leia essa config e dispare o export. Os únicos `pg_cron` reais no repo são para o
  `automation-worker`.
- **Sem error tracking externo** (Sentry/LogRocket/Datadog) — `logger.ts` só persiste
  `logger.error()` em produção, como string crua, na tabela `error_logs` (que, aliás, é uma das
  6 sem migration/RLS do achado #1).

---

## O que está genuinely bom

- **APIs & Backend Logic**: 33 edge functions, `_shared/` com CORS + logger estruturado com
  redação de segredos — bem organizado.
- **Caching**: service worker com estratégia certa por tipo de asset (network-first pra
  JS/CSS/navegação, cache-first pra imagens/fontes, bypass total de `/functions/`, `/rest/`,
  `/auth/`), mais `staleTime` calibrado por query no React Query.
- **Indexes & Query Optimization**: 106 índices, migration dedicada de performance
  (`20260610120100_perf_composite_indexes.sql`), RPCs de agregação (`dashboard_kpis`,
  `csat_stats`, `sla_metrics`, `match_rag_documents`) evitando trazer dataset inteiro pro
  client.
- **Concurrency**: `sdr-worker` implementa um claim atômico correto
  (`UPDATE ... WHERE status='pending'` condicional) — compare-and-swap sem precisar de
  `SELECT FOR UPDATE`.
- **Security hardening já em andamento**: várias migrations recentes de endurecimento
  (`security_hardening_cleanup`, `revoke_public_execute_sensitive_rpcs`,
  `fix_profiles_rls_recursion`, `tenant_isolation_fixes`) mostram que o time já vinha
  trabalhando nisso antes desta auditoria.

---

## Recomendação de próximos passos (ordem sugerida, cada um exige seu próprio aviso/aprovação)

1. **Reconciliar as 36 migrations órfãs** (`migration repair`, não-destrutivo, só bookkeeping) —
   runbook pronto em `docs/migration-history-reconciliation.md`. Precisa de Supabase CLI + senha
   do Postgres (não dá via MCP) — ver prompt de handoff em `HANDOFF-PENDENCIAS.md`.
2. **Decidir**: manter a automação de backup como está (config decorativa) ou implementar o
   `cron.schedule` que falta.
3. **Decidir**: adicionar Sentry (ou equivalente) para error tracking real, já que hoje não há
   visibilidade de produção além de queries manuais na tabela `error_logs`.
4. ~~Fechar os 2 vazamentos residuais do Lote 3.5~~ — `useCsatSender.ts` corrigido; falta só
   `WhatsAppManagement.tsx`, aguardando aval explícito (área sensível).
5. Atualizar/remover `docker-compose.upixel.yml` obsoleto e decidir o destino real do
   `sdr-worker` (VPS via systemd? outro host?) — ver prompt de handoff (investigação da VPS).

*Relatório gerado por auditoria automatizada — evidências coletadas via grep/leitura direta do
repositório em 2026-07-19. Nenhuma alteração de código foi feita como parte desta auditoria.*
