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
| 6 | `src/services/automations.ts` | pendente | — | — |

## Lote 2 — migrar hooks moderados (aguardando plano detalhado + OK)
## Lote 3 — AppContext.tsx + useInbox.ts (aguardando)
## Lote 4 — 🟠 Signup/Users/Organization/auth (NUNCA sem OK explícito)
