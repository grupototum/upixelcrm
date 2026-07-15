# totum-state.md — Adequação arquitetural por camadas

**Branch:** `claude/upixelcrm-layering-phase-2-b61f6l` · **PR:** #37
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
| 5 | useUnreadCounts → services/inbox | em execução | — | — |
| 6 | useAutomationRuns/Stats → services/automations | pendente | — | — |
| 7 | useSequences → services/automations | pendente | — | — |
| 8 | useFacebookPage/useInstagram → integrations+users | pendente | — | — |
| 9 | useMetaAds/useGoogleAds → services/integrations | pendente | — | — |
| 10 | useDuplicateDetection → services/leads | pendente | — | — |
| 11 | useBroadcast + BroadcastConfigModal → broadcast+users | pendente | — | — |
## Lote 3 — AppContext.tsx + useInbox.ts (aguardando)
## Lote 4 — 🟠 Signup/Users/Organization/auth (NUNCA sem OK explícito)
