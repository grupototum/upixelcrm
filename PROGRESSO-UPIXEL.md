# Progresso — uPixel CRM

**Branch:** `fix/security-pc-026-038` (base: `origin/claude/supabase-cloud-to-selfhosted-gp1tn1` @ `4fda17b`)
**Atualizado:** 2026-08-10
**Push:** último push em `6165bb6`. Commits posteriores são **locais**.

---

## Commits

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

`tsc --noEmit` comparado com a baseline a cada commit: **22 erros pré-existentes, 0 novos** em todos.

---

## Fase 1 — status por item

| Item | Código | Status |
|---|---|---|
| 1.1 | PC-038 (b+d+e) | 🟡 **PARCIAL** — script (b) pronto e commitado, não executado. (d)+(e)+`public=false` aguardam o dry-run de (b) |
| 1.2 | PC-028 | 🔴 **BLOQUEADO** — precisa da política de domínios |
| 1.3 | PC-033 / H-018 | ✅ **FEITO** (`bcec8ba`) — falta validação de ciclo no builder (frontend) |
| 1.4 | PC-034 | ✅ **FEITO** (`da3d090`) |
| 1.5 | PC-037 | 🔴 **BLOQUEADO** — decisão de configuração por tenant |
| 1.6 | PC-031 | ✅ **FEITO** (`616e99f`) |
| 1.7 | PC-039 | 🔴 **BLOQUEADO** — precisa do enum canônico de roles |
| 1.8 | PC-040 | 🔴 **BLOQUEADO** — drift de migrations precede |
| 1.9 | PC-029 | ✅ **FEITO** (`88bab56`) |

**5 de 9 concluídos · 1 parcial · 4 bloqueados por decisão.**

---

## Bloqueios — o que cada um precisa de você

### PC-028 · CORS
`Access-Control-Allow-Origin` aceita `*` **ou uma origem exata** — wildcard de subdomínio não existe na spec. O app é multi-tenant por subdomínio (`ROOT_DOMAINS` em `src/utils/tenant.ts:1` lista `upixel.app`, `upixel.com.br`). Fixar uma origem quebra todos os tenants menos um.

**Preciso saber:** a lista definitiva de domínios (raiz + previews da Vercel). A correção ecoa o `Origin` quando casa com a allowlist, o que transforma `corsHeaders` de objeto estático em função da request — refactor nas 34 funções que fazem `...corsHeaders`.

### PC-037 · verify_token no handshake
No GET da Meta não existe contexto de tenant — só `hub.verify_token`. Por isso o código varre todas as integrações. A correção é exigir `integration_id` na URL do webhook (o `whatsapp-cloud-webhook` já tem esse caminho em `:211`) e remover o fallback.

**Preciso saber:** se todos os tenants já têm `integration_id` na URL cadastrada na Meta. Se não tiverem, remover o fallback derruba a integração deles.

### PC-039 · roles fantasma
Três definições divergem:

| Fonte | Roles |
|---|---|
| `AuthContext.tsx:29` | master, admin, supervisor, gerente, vendedor, atendente (6) |
| `types/index.ts:13` | supervisor, atendente, vendedor, master (4) |
| `admin-create-user:55` | master, supervisor, atendente, vendedor (4) |
| **Banco** | `role TEXT NOT NULL DEFAULT 'vendedor'` — **sem CHECK** |

Como não há constraint, qualquer string é gravável. **Não dá para provar que nenhum usuário em produção tem `admin`** sem rodar `SELECT DISTINCT role FROM profiles`. Remover a concessão no frontend pode trancar usuário real para fora.

**Preciso de:** o resultado dessa query, ou sua decisão sobre o enum canônico.

### PC-040 · migrations no CI
O relatório registra **36 versions aplicadas em produção sem arquivo local**, e a automação anterior (PR #29) foi **revertida** (PR #30) exatamente por isso. Rodar `db push` com 93 migrations locais contra schema divergente repete o erro.

**Precede:** reconciliar o drift (`docs/migration-history-reconciliation.md` tem runbook).

---

## Ações manuais obrigatórias (painel Supabase)

| # | Ação | Urgência |
|---|---|---|
| 1 | Setar `WHATSAPP_APP_SECRET` nas secrets das Edge Functions | 🔴 **ANTES do deploy** — sem isso o PC-026 retorna 403 em todo inbound Meta Official |
| 2 | Setar `ALLOWED_ORIGINS` | 🟡 Enquanto não estiver setada, o CORS é `*` efetivo nas 34 funções |
| 3 | Rodar dry-run do backfill PC-038 (b) | 🟠 O número de órfãos decide se dá para fechar o bucket sem quebrar mídia |
| 4 | Aplicar a migration `20260810120000_pc029_rate_limits.sql` | 🟡 Sem ela, `bump_rate_limit` não existe e o rate limit falha aberto (sem efeito) |
| 5 | Revisar `pg_policies` (H-012/013/015/016) | 🟡 Não verificável por código |

---

## Próximos passos

1. **Fechar PC-038** — dry-run do backfill → revisar órfãos → executar → então (d)+(e)+`public=false`. Enquanto o bucket for público, os commits `3dce29e` e `2f10498` não protegem nada.
2. **Destravar os 4 bloqueados** com as decisões acima.
3. **Push + PR** da branch (7 commits locais além do último push).
4. **Fase 2** — features, em branch nova a partir de `origin/main`. Não iniciada.
5. **Fase 3** — não executar.

---

## Notas de contexto

O `main` do repositório foi apagado em 2026-08-09 (`53102f1` "Initial commit", 126 arquivos, sem código). Esta branch parte de `claude/supabase-cloud-to-selfhosted-gp1tn1` @ `4fda17b` (30/07), a sobrevivente mais completa — **não é o `main` perdido**. A decisão sobre o que vira `main` de verdade segue em aberto.

Revalidação de 2026-08-10 mostrou que PC-001, PC-005/006, PC-007 e PC-009/010 **já estavam corrigidos** nesta branch — o relatório original descrevia um estado anterior a ela.
