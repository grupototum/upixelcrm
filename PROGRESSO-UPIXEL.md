# Progresso — uPixel CRM

**Atualizado:** 2026-08-10

Duas branches, ambas partindo de `origin/claude/supabase-cloud-to-selfhosted-gp1tn1` @ `4fda17b`.
`origin/main` estava com o histórico apagado desde 2026-08-09 (`53102f1`, 126 arquivos, sem
código-fonte) — não servia de base para nada. Esta branch (`integracao-20260810`) junta
`fix/security-pc-026-038` + `feature/upixel-aug-sprint` para virar o `main` de verdade.

---

## Fase 1 — Segurança · `fix/security-pc-026-038`

| Hash | Item | Arquivos | Build | tsc |
|---|---|---|---|---|
| `c760673` | PC-026 — HMAC SHA-256 no webhook Meta Official | `whatsapp-webhook/index.ts` | ✅ | ✅ |
| `3dce29e` | PC-038 (A+C) — prefixo por tenant + assinatura na renderização | 4 arquivos | ✅ | ✅ |
| `6165bb6` | PC-027 — fallback cross-tenant removido | `meta-leads-webhook/index.ts` | ✅ | ✅ |
| `2f10498` | PC-038 (b) — script de backfill (**não executado**) | `scripts/backfill-whatsapp-media-tenant-prefix.mjs` | — | — |
| `616e99f` | PC-031 — `facebook-messenger-webhook` no config.toml | `supabase/config.toml` | ✅ | ✅ |
| `da3d090` | PC-034 — audita merge de leads antes de excluir | `whatsapp-webhook/index.ts` | ✅ | ✅ |
| `bcec8ba` | PC-033/H-018 — cycle-guard no automation-engine | `automation-engine/index.ts` | ✅ | ✅ |
| `88bab56` | PC-029 — rate limiting nos webhooks de inbound | migration + `_shared/rateLimit.ts` + 2 webhooks | ✅ | ✅ |
| `f7c5ba0` | PC-038 (d/e) — RLS tenant-scoped + bucket privado (**rascunho, não aplicado**) | migration | ✅ | ✅ |

`tsc --noEmit` comparado com a baseline a cada commit: **22 erros pré-existentes, 0 novos** em todos.

**5 de 9 itens da Fase 1 concluídos.** Bloqueados por dependerem de dados fora do repositório:

| Item | Precisa de |
|---|---|
| PC-028 · CORS | Lista definitiva de domínios (raiz + previews Vercel). `Access-Control-Allow-Origin` só aceita `*` ou origem exata — wildcard de subdomínio não existe na spec, e o app é multi-tenant por subdomínio |
| PC-037 · verify_token | Confirmar se todo tenant tem `integration_id` na URL cadastrada na Meta antes de remover o fallback que varre todas as integrações |
| PC-039 · roles | `SELECT DISTINCT role FROM profiles` — a coluna é TEXT sem CHECK, três fontes no código divergem (6 roles vs 4 vs 4) |
| PC-040 · migrations no CI | Reconciliar 36 versions órfãs primeiro (PR #29 já foi revertido por isso) |

---

## Fase 2 — Features · `feature/upixel-aug-sprint`

| Hash | Item | Migration |
|---|---|---|
| `f7ae5b0` | 2.1 — mensagens fromMe aparecem no inbox | — |
| `56013cc` | 2.2 — ação `create_task` implementada no engine | — |
| `1502751` | 2.3 — redesign do card de lead no Kanban | — |
| `9ed7d4e` | 2.4 — drag-to-scroll horizontal no board | — |
| `58d8a3a` | 2.5 — edição inline de nota | — |
| `2404cb4` | 2.6 — concluir tarefa com resultado | `20260810130000` |
| `bc1cbc9` | 2.7 — descrição por coluna do Kanban | `20260810140000` |

**7 de 7 concluídos.** Build verde e `tsc` idêntico à baseline (22 erros pré-existentes, 0 novos) em cada commit.

### Causas-raiz que divergiram do plano

- **2.2 não era bug do delay.** O delay funcionava; o builder oferecia "Criar tarefa" mas o engine nunca implementou a ação — caía fora de todos os `if/else`, sem erro e sem log. Adicionado `else` final para que qualquer ação não implementada apareça no run.
- **2.5 não tem tabela `notes`.** As notas do perfil são JSON em `leads.notes_local`. Sem migration; `updated_at` é campo do objeto dentro do JSON.
- **2.6:** `status` já existia com CHECK desde `20260324225441` — não recriada.
- **2.7:** a tabela é `pipeline_columns`, não `pipeline_stages`.

---

## Revisão Totum (2026-08-10)

Os 16 commits técnicos das duas branches foram revisados linha a linha contra o padrão Totum
(segurança, performance, arquitetura, qualidade). **Nenhum problema exigiu correção** — build,
`tsc` (sem regressão vs. baseline) e os 47 testes passam nos dois branches. Único artefato
gerado pela revisão: o rascunho de RLS do PC-038 (d/e), acima.

---

## Ações manuais obrigatórias (painel Supabase)

| # | Ação | Urgência |
|---|---|---|
| 1 | Setar `WHATSAPP_APP_SECRET` nas secrets das Edge Functions | 🔴 **ANTES do deploy** — sem isso o PC-026 retorna 403 em todo inbound Meta Official |
| 2 | Ligar `WEBHOOK_MESSAGE_FROM_ME` no Evolution | 🟠 Sem isso o evento do 2.1 nem chega |
| 3 | Aplicar as migrations novas (`20260810120000`, `130000`, `140000`) | 🟠 Sem elas, 2.6/2.7 falham na escrita e o rate limit fica inerte |
| 4 | Rodar dry-run do backfill PC-038 (b) | 🟠 O nº de órfãos decide se dá para fechar o bucket sem quebrar mídia |
| 5 | Revisar e aplicar o rascunho PC-038 (d/e) (`20260810150000`) | 🟠 Depende do item 4 primeiro |
| 6 | Setar `ALLOWED_ORIGINS` | 🟡 Enquanto não estiver setada, CORS é `*` efetivo nas 34 funções |
| 7 | Revisar `pg_policies` (H-012/013/015/016) | 🟡 Não verificável por código |

---

## Próximos passos

1. PR de `integracao-20260810` → `main` (este documento já reflete o estado pós-merge).
2. Destravar os 4 itens bloqueados da Fase 1 com as decisões acima.
3. Fechar PC-038: dry-run do backfill → revisar órfãos → executar → aplicar o rascunho (d)+(e).
4. Fase 3 — não iniciada, não executar.

---

## Notas de contexto

O `main` do repositório estava com o histórico apagado desde 2026-08-09 (`53102f1` "Initial
commit", 126 arquivos, sem código) — por isso as Fases 1 e 2 partiram de
`claude/supabase-cloud-to-selfhosted-gp1tn1` @ `4fda17b` (30/07), a branch sobrevivente mais
completa. O `main` antigo foi preservado em `main-backup-20260810` antes de qualquer alteração.

Revalidação de 2026-08-10 mostrou que PC-001, PC-005/006, PC-007 e PC-009/010 **já estavam
corrigidos** nesta branch — o relatório original descrevia um estado anterior a ela.
