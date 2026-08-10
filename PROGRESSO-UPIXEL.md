# Progresso — uPixel CRM

**Atualizado:** 2026-08-10

Duas branches, ambas partindo de `origin/claude/supabase-cloud-to-selfhosted-gp1tn1` @ `4fda17b`.
`origin/main` está apagado desde 2026-08-09 (`53102f1`, 126 arquivos, sem código-fonte),
por isso não serve de base para nada.

---

## Fase 1 — Segurança · `fix/security-pc-026-038` · **pushada**

| Hash | Item |
|---|---|
| `c760673` | PC-026 — HMAC SHA-256 no webhook Meta Official |
| `3dce29e` | PC-038 (A+C) — prefixo por tenant + assinatura na renderização |
| `6165bb6` | PC-027 — fallback cross-tenant removido |
| `2f10498` | PC-038 (b) — script de backfill (**não executado**) |
| `616e99f` | PC-031 — facebook-messenger-webhook no config.toml |
| `da3d090` | PC-034 — audita merge de leads antes de excluir |
| `bcec8ba` | PC-033/H-018 — cycle-guard no automation-engine |
| `88bab56` | PC-029 — rate limiting nos webhooks de inbound |
| `4a4792b` | docs |

**5 de 9 itens.** Bloqueados por dependerem de dados fora do repositório:

| Item | Precisa de |
|---|---|
| PC-028 · CORS | Lista definitiva de domínios (raiz + previews Vercel) |
| PC-037 · verify_token | Confirmar se todo tenant tem `integration_id` na URL cadastrada na Meta |
| PC-039 · roles | `SELECT DISTINCT role FROM profiles` — a coluna é TEXT sem CHECK |
| PC-040 · migrations no CI | Reconciliar 36 versions órfãs primeiro (PR #29 já foi revertido por isso) |

---

## Fase 2 — Features · `feature/upixel-aug-sprint` · **local, sem push**

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

## Ações manuais (painel Supabase)

| # | Ação | Urgência |
|---|---|---|
| 1 | Setar `WHATSAPP_APP_SECRET` | 🔴 **ANTES do deploy** — sem isso o PC-026 retorna 403 em todo inbound Meta Official |
| 2 | Ligar `WEBHOOK_MESSAGE_FROM_ME` no Evolution | 🟠 Sem isso o evento do 2.1 nem chega |
| 3 | Aplicar as 3 migrations novas (`20260810120000`, `130000`, `140000`) | 🟠 Sem elas, 2.6/2.7 falham na escrita e o rate limit fica inerte |
| 4 | Dry-run do backfill PC-038 (b) | 🟠 O nº de órfãos decide se dá para fechar o bucket |
| 5 | Setar `ALLOWED_ORIGINS` | 🟡 Enquanto não estiver setada, CORS é `*` efetivo |
| 6 | Revisar `pg_policies` (H-012/013/015/016) | 🟡 Não verificável por código |

---

## Próximos passos

1. Push da `feature/upixel-aug-sprint` (aguardando instrução)
2. Fechar PC-038: dry-run → revisar órfãos → executar → (d)+(e)+`public=false`
3. Destravar os 4 itens da Fase 1 com os dados do painel
4. Fase 3 — não iniciada, não executar
