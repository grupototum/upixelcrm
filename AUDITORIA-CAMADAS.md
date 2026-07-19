# Auditoria de Conformidade Arquitetural — uPixel CRM

**Data:** 2026-07-19
**Modo:** SOMENTE-LEITURA (nenhum arquivo de código alterado nesta auditoria)
**Taxonomia:** 13 camadas + 7 sub-camadas de banco de dados
**Status:** ✅ ISOLADA · ⚠️ PARCIAL · ❌ MISTURADA · ➖ NÃO IMPLEMENTADA

> Esta auditoria substitui a versão anterior (entregue só no chat, nunca salva em arquivo).
> Todas as evidências abaixo vêm de grep/leitura real do repo em `/home/user/upixelcrm`,
> não de inferência. Caminhos de arquivo e contagens são verificáveis.

---

## Resumo executivo

| # | Camada | Status | Achado principal |
|---|---|---|---|
| 1 | Frontend | ⚠️ PARCIAL | 98% migrado (Lotes 1-4+3.5), mas 2 vazamentos residuais |
| 2 | APIs & Backend Logic | ✅ ISOLADA | 33 edge functions organizadas, `_shared/` compartilhado |
| 3 | Database & Storage | ⚠️ PARCIAL | 6 tabelas em produção **sem nenhuma migration** |
| 4 | Auth & Permissions | ⚠️ PARCIAL | Client-side (UI) + RLS (real) duplicados por design |
| 5 | Hosting & Deployment | ⚠️ PARCIAL | Split real limpo, mas `docker-compose.upixel.yml` ficou obsoleto |
| 6 | Cloud & Compute | ⚠️ PARCIAL | VPS ganhou 3º workload (`sdr-worker`) não documentado na limpeza |
| 7 | CI/CD & Version Control | ⚠️ PARCIAL | Frontend com gate (lint+test+build); **migrations fora do CI** |
| 8 | Security & RLS | ⚠️ PARCIAL | 49 tabelas com RLS (254 policies), mas 6-7 **sem RLS nenhuma** |
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

**Contagem:** 5 ✅ ISOLADA · 12 ⚠️ PARCIAL · 2 ❌ MISTURADA · 2 ➖ NÃO IMPLEMENTADA (a soma dá 21 porque Rate Limiting e Load Balancing são as duas ➖, e ambas são aceitáveis nesta escala — não são "buracos", são escolhas razoáveis de não reinventar o que a plataforma já resolve).

---

## 🔴 Os 2 achados que mais importam (tocam No-Fly Zones do CLAUDE.md)

### 1. Migrations — drift real em produção (#18, ❌ MISTURADA)

`docs/migration-history-reconciliation.md` já documenta isto: **36 versions** existem na tabela remota `supabase_migrations.schema_migrations` **sem arquivo local correspondente** — aplicadas via MCP `apply_migration`, dashboard ou SQL direto, nunca commitadas no repo. Uma tentativa anterior de automatizar deploy de migration no CI (PR #29) foi **revertida** (PR #30) exatamente por causa desse drift.

Consequência prática: **6 tabelas em produção não têm NENHUM arquivo de migration** —
`backup_configs`, `backup_runs`, `error_logs`, `bots`, `bot_sessions`, `meta_oauth_sessions`.
Se alguém rodar `supabase db reset` ou provisionar um projeto novo a partir do repo, essas
tabelas simplesmente não existem.

### 2. Security & RLS — tabelas sem proteção nenhuma (#8, ⚠️ PARCIAL grave)

As mesmas 6 tabelas acima (mais `whatsapp_message_dedup`) não têm **nenhuma** `ENABLE ROW LEVEL
SECURITY`. A função `database-backup` mitiga isso usando service-role key + checagem manual de
`role === "master"` no código — mas é uma rede de segurança de aplicação, não de banco. Se esse
`if` for removido ou contornado (bug futuro, outra função que toque a tabela), não há RLS
segurando a porta.

**Isto é exatamente o tipo de coisa que o CLAUDE.md marca como No-Fly Zone**
("Banco de dados: RLS policies, tenant_id isolamento" e "Exclusão de dados" — regra:
"IA sugere. Humano aprova."). Não vou mexer em RLS nem criar migrations de correção sem
autorização explícita sua.

---

## Achados menores (não bloqueantes, mas vale saber)

- **`useCsatSender.ts`** e **`WhatsAppManagement.tsx`** (linha ~218) ainda fazem `.from()` direto
  fora de `src/services/` — escaparam do Lote 3.5 porque não bateram com os padrões de busca
  usados na varredura original. Fácil de fechar num lote pequeno futuro.
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

1. **Reconciliar as 36 migrations órfãs** — já existe um runbook pronto em
   `docs/migration-history-reconciliation.md`. Prioridade alta por ser pré-requisito de tudo
   mais (sem isso, `supabase db push` não funciona e novas migrations arriscam conflitar).
2. **Adicionar migrations retroativas para as 6 tabelas órfãs** (`backup_configs`, `backup_runs`,
   `error_logs`, `bots`, `bot_sessions`, `meta_oauth_sessions`) — com `ENABLE ROW LEVEL SECURITY`
   e políticas adequadas. Área sensível — precisa do seu aval explícito antes de qualquer
   implementação.
3. **Decidir**: manter a automação de backup como está (config decorativa) ou implementar o
   `cron.schedule` que falta.
4. **Decidir**: adicionar Sentry (ou equivalente) para error tracking real, já que hoje não há
   visibilidade de produção além de queries manuais na tabela `error_logs`.
5. Fechar os 2 vazamentos residuais do Lote 3.5 (`useCsatSender.ts`, `WhatsAppManagement.tsx`) —
   baixo risco, pode ser um lote pequeno.
6. Atualizar/remover `docker-compose.upixel.yml` obsoleto e decidir o destino real do
   `sdr-worker` (VPS via systemd? outro host?) para fechar a documentação de infra.

*Relatório gerado por auditoria automatizada — evidências coletadas via grep/leitura direta do
repositório em 2026-07-19. Nenhuma alteração de código foi feita como parte desta auditoria.*
