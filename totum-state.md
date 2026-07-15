# totum-state.md — Adequação arquitetural por camadas

**Branch:** `claude/upixelcrm-layering-phase-2-b61f6l` · **PR:** #37 (Lotes 1, 2 e fatia I-1 — MERGED em 2026-07-15, squash `906dd5f`) → restante do Lote 3 em novo PR
**Fase 1 (diagnóstico):** concluída no Cowork em 2026-07-15 (relatório aprovado no prompt da sessão).
**Fase 2 (plano):** aprovada em 2026-07-15 — 4 lotes; Lote 4 só com OK explícito.

## Regras ativas
- 1 movimento = 1 commit = 1 iteração; build + lint após cada movimento; quebrou → reverte.
- Nenhum commit antes da aprovação do lote (inclusive config).
- Intocáveis: `supabase/migrations`, `supabase/functions`, `deploy/`, `.github/`, RLS/Auth/Storage.
- 🔴 Catalogados, NÃO aplicar: `SUPABASE_BROADCAST_SETUP.sql`, `SUPABASE_FIX_AUTOMATIONS_AND_SEQUENCES.sql`, `SUPABASE_FIX_CUSTOM_FIELDS.sql` (raiz) + .sql em `scripts/`.

## Lote 1 — repositórios por domínio (aprovado 2026-07-15)

| # | Movimento | Status | Build | Lint |
|---|---|---|---|---|
| 1 | `src/services/leads.ts` (tags, custom_field_definitions, leads) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |
| 2 | `src/services/users.ts` (profiles: leituras moderadas) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |
> Nota mov. 2: usePermissions é lógica pura (sem queries) — fonte real do domínio users são useBroadcast, IntegrationsPage, hooks de FB/IG, mentions.ts, ProfileSettings e ConversationActions.
| 3 | `src/services/integrations.ts` (integrations, api_keys, webhook_endpoints, ad_campaigns, edges de provedores) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |
| 4 | `src/services/inbox.ts` (inbox_templates, macros, tasks, contadores) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |
> Nota mov. 4: useConversationLabels é in-memory puro (sem queries) — fora do repositório. Queries de conversations/messages do useInbox migram no Lote 3.
| 5 | `src/services/broadcast.ts` (whatsapp_templates, broadcast_campaigns, dispatch_logs, créditos, edge) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |
| 6 | `src/services/automations.ts` (sequences, steps, automation_runs, stats) | ✅ 2026-07-15 | ✅ | ✅ 0 problemas |

**Lote 1 concluído em 2026-07-15** — 6/6 movimentos, build e lint verdes em todos. Aguardando OK para o Lote 2.

## Lote 2 — migrar hooks moderados (aprovado 2026-07-15)

Regras extras aprovadas: #8 sem qualquer mudança de fluxo de auth (só remoção de leitura duplicada + troca de query); #10 mesma semântica nas operações destrutivas; #11 fetches diretos Evolution/Meta ficam. #1–7 executados com Sonnet 5 (subagentes), #8–11 com o modelo principal. Checkpoint parcial após #7.

| # | Movimento | Status | Build | Lint |
|---|---|---|---|---|
| 1 | useTags → services/leads | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ 0 problemas |
| 2 | useCustomFields → services/leads | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ 0 problemas |
| 3 | useCannedResponses → services/inbox | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ (1 warning exhaustive-deps pré-existente) |
| 4 | useMacros → services/inbox | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ 0 problemas |
| 5 | useUnreadCounts → services/inbox | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ 0 problemas |
| 6 | useAutomationRuns/Stats → services/automations | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ (2 warnings `any` pré-existentes) |
| 7 | useSequences → services/automations | ✅ 2026-07-15 (Sonnet 5) | ✅ | ✅ (5 warnings `any` pré-existentes, 0 novos) |

**Checkpoint parcial #1–7 entregue em 2026-07-15.** #8–11 seguem com o modelo principal.
| 8 | useFacebookPage/useInstagram → integrations+users | ✅ 2026-07-15 (modelo principal, Sonnet 5) | ✅ | ✅ (6 warnings `any` pré-existentes, 0 novos) |
| 9 | useMetaAds/useGoogleAds → services/integrations | ✅ 2026-07-15 (modelo principal, Sonnet 5) | ✅ | ✅ (0 problemas — 4 warnings `any` pré-existentes eliminados) |
| 10 | useDuplicateDetection → services/leads | ✅ 2026-07-15 (modelo principal, Sonnet 5) | ✅ | ✅ (0 problemas — 1 warning `any` pré-existente eliminado) |
> Nota mov. 10: `reassignLeadRelations` (criada no Lote 1, ainda não consumida por nenhum hook) lançava em erro — divergia da semântica real do app (Promise.all sem checar erro). Corrigido para não lançar, igualando o comportamento atual do merge(). Adicionadas `reassignAndMergePrimary` e `bulkDeleteLeadsLogOnly` espelhando exatamente o batch de 4 vias e o delete com log-e-continua do mergeMany. Nenhuma heurística de matching/pickPrimary foi tocada.
| 11 | useBroadcast + BroadcastConfigModal → broadcast+users | ✅ 2026-07-15 (modelo principal, Sonnet 5) | ✅ | ✅ (4 warnings `any` pré-existentes, 7 eliminados, 0 novos) |

**Lote 2 concluído em 2026-07-15** — 11/11 movimentos, build e lint verdes em todos. Aguardando OK para o Lote 3.
## Lote 3 — useInbox.ts + AppContext.tsx (aprovado 2026-07-15, com travas)

Travas: (1) checkpoint obrigatório após as 5 fatias do useInbox — AppContext só após OK; (2) fatia refreshData do AppContext tem gate próprio (lista de consumidores + estratégia antes); (3) cada fatia registra commit-pai para revert isolado; smoke falhou → reverte e reporta, não conserta no embalo; (4) smoke por fatia: USUÁRIO testa no preview Vercel (ambiente remoto sem .env) e dá ✅/❌ antes da próxima fatia; (5) decisão de comportamento em código já consumido = pausa e pergunta; (6) auth/schema/RLS/migrations/functions = pausa imediata.

Roteiro smoke useInbox: abrir inbox, abrir conversa, enviar texto, mudar status, realtime em 2ª aba. Roteiro AppContext: board carrega, drag entre colunas, criar/editar lead, badges.

| # | Fatia | Commit-pai (revert) | Status | Build | Lint | Smoke |
|---|---|---|---|---|---|---|
| I-1 | useInbox: lista de conversas + filtros | abb70c5 | ✅ 2026-07-15 | ✅ | ✅ (23 pré-existentes, 0 novos) | ✅ por revisão de código (usuário); smoke ao vivo PENDENTE |
| I-2 | useInbox: mensagens + realtime | 906dd5f (base nova pós-merge) | ✅ 2026-07-15 | ✅ | ✅ (23 pré-existentes, 0 novos) | ⏳ revisão do usuário |

> ⚠️ Limitação descoberta na I-1: previews Vercel (`*.vercel.app`) não batem com subdomínio de tenant — TenantContext cai em "Empresa não encontrada" antes do inbox. Smoke ao vivo por fatia é impossível em preview; aprovações do Lote 3 passam a ser por revisão de código do usuário no commit, com smoke real consolidado pendente (rodar em staging/produção com subdomínio válido após o checkpoint).
| I-3 | useInbox: envio de mensagem | — | pendente | — | — | — |
| I-4 | useInbox: ações de conversa (status/assign/labels) | — | pendente | — | — | — |
| I-5 | useInbox: restante (sessão/typing/locais) | — | pendente | — | — | — |
| A-1 | AppContext: leads/columns/pipelines | — | pendente | — | — | — |
| A-2 | AppContext: tasks | — | pendente | — | — | — |
| A-3 | AppContext: notifications | — | pendente | — | — | — |
| A-4 | AppContext: refreshData (🚧 gate próprio) | — | pendente | — | — | — |
## Lote 4 — 🟠 Signup/Users/Organization/auth (NUNCA sem OK explícito)
