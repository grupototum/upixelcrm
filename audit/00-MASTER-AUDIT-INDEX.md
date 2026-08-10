# Índice Mestre — Auditoria Arquitetural uPixel CRM

**Projeto:** uPixel CRM
**Sistema:** Vibe Coding Totum v3.0
**Última atualização:** 2026-08-09

> ⚠️ **Este arquivo foi RECRIADO em 2026-08-09.** O índice original e o relatório da Etapa 1 foram perdidos no incidente descrito abaixo. As linhas referentes à Etapa 1 são reconstruídas a partir do briefing da Etapa 2, não do relatório original.

---

## Incidente de perda de código — 2026-08-09

Ao iniciar a Etapa 2, o diretório de trabalho estava sem o código-fonte:

- `src/` com 5 arquivos (faltavam `components/`, `hooks/`, `lib/`, `pages/`, `services/`, `contexts/`)
- `supabase/` só com `config.toml` (sem `functions/` nem `migrations/`)
- `.git/` sem `objects/`, `refs/` e `logs/` → repositório inutilizável
- `audit/` inexistente
- A cópia em `~/Documents/Bulma/40-49_Trabalho/40.02_Projetos/upixelcrm/upixelcrm` estava danificada de forma idêntica

**Recuperado:** clone de `origin/main` @ `4d376ad` em diretório temporário (33 edge functions, 93 migrations, 287 arquivos em `src/`).
**Perdido:** a branch `feat/sdr-fase-0` (não existe no remoto), o commit `feat(sdr): ativação de campanha e encerramento no dispatcher`, e `audit/01-auditoria-geral.md`.
**Pendente:** decisão sobre restauração do working tree e investigação da causa raiz — ver §9.1 do relatório da Etapa 2.

---

## Progresso das etapas

| Etapa | Escopo | Status | Relatório |
|---|---|---|---|
| 1 | Auditoria geral (visão macro, inventário, achados PC-001…PC-025, H-001…H-011) | ⚠️ **relatório perdido** | `01-auditoria-geral.md` — **ausente** |
| 2 | Camada de API e regras de negócio (33 edge functions + automações no frontend) | ✅ **concluída** | [`02-api-regras-negocio.md`](02-api-regras-negocio.md) |
| — | Snapshot de camadas (visão transversal + correção de métricas) | ✅ **concluído** | [`SNAPSHOT-CAMADAS.md`](SNAPSHOT-CAMADAS.md) |
| 3 | Banco de dados, RLS e multi-tenancy | ⬜ pendente | — |
| 4 | Frontend, estado e experiência | ⬜ pendente | — |
| 5 | Infraestrutura, secrets e deploy | ⬜ pendente | — |

---

## Achados por etapa

### Etapa 2 — API e regras de negócio (12 confirmados, 9 riscos prováveis, 8 hipóteses)

| ID | Severidade | Achado |
|---|---|---|
| PC-026 | 🔴 Crítico | `whatsapp-webhook` aceita payloads Meta Official sem validar `X-Hub-Signature-256` |
| PC-027 | 🟠 Alto | `meta-leads-webhook` atribui leads ao tenant errado (`\|\| !cfg?.page_id`) |
| PC-028 | 🟠 Alto | CORS `*` efetivo nas 33 funções (`ALLOWED_ORIGINS` nunca definida) |
| PC-029 | 🟠 Alto | Zero rate limiting em toda a camada de API |
| PC-030 | 🟡 Médio-alto | `automation-worker` e `whatsapp-queue-processor` aceitam qualquer JWT de usuário |
| PC-031 | 🟡 Médio | `facebook-messenger-webhook` fora do `config.toml` → morto em produção |
| PC-032 | 🟡 Médio | Motor de bot duplicado dentro do `whatsapp-webhook` |
| PC-033 | 🟡 Médio | `automation-engine` sem limite de profundidade → ciclo = invocação infinita |
| PC-034 | 🟡 Médio | Merge de leads deleta registros sem confirmação nem log |
| PC-036 | 🟡 Médio | Nó `webhook` pode exfiltrar qualquer coluna de `leads` |
| PC-037 | 🟢 Baixo-médio | Handshake GET permissivo em 2 webhooks (mesma classe do PC-004) |
| PC-035 | 🟢 Baixo | `asaas-webhook` vaza comprimento do token no compare |

### Snapshot de camadas (4 achados novos)

| ID | Severidade | Achado |
|---|---|---|
| PC-038 | 🟠 Alto | Bucket `whatsapp_media` é **público** — mídia de todos os tenants acessível por URL |
| PC-039 | 🟡 Médio | Roles fantasma: tipo declara 6, sistema aceita 4; `usePermissions` libera `admin` inexistente |
| PC-040 | 🟡 Médio | CI não aplica migrations — schema é 100% manual |
| PC-041 | 🟡 Médio | Deploy real (Vercel + Supabase Cloud) diverge da documentação (self-hosted) |

### Correções aplicadas

| Data | Achado | Arquivo | Estado |
|---|---|---|---|
| 2026-08-09 | **PC-026** | `supabase/functions/whatsapp-webhook/index.ts` | ✅ patch pronto e revisado — **aguardando restauração do working tree para aplicar**. Exige o secret `WHATSAPP_APP_SECRET` antes do deploy |

### Reavaliação dos achados da Etapa 1 contra `main` @ `4d376ad`

| ID | Status |
|---|---|
| PC-004 — bypass do verify token do webhook WhatsApp | ✅ **resolvido** (`whatsapp-webhook:956-963`, comentário `FIX-01`) |
| PC-005/06 — tokens em Base64 / `Math.random()` | ⬜ não coberto nesta etapa → Etapa 3 (ver RP-004) |
| PC-011 — "Nova Automação" insere no banco sem wizard | ❌ **confirmado** (`ComplexTab.tsx:23-26`) |
| PC-012 — reconexão WhatsApp travada | ⚪ fora do escopo → Etapa 4 (H-017) |
| PC-025 — automações executadas no browser | ⚠️ **parcial** — `pg_cron` corrigido, polling do browser permanece |
| H-003 — webhooks sem validar tenant do remetente | ⚠️ **parcial** — 2 de 3 corrigidos; vira PC-026 e PC-027 |
| H-011 — `admin-create-user` chamável sem ser master | ✅ **refutado** (`admin-create-user:33-42`) |

---

## Quick Wins abertos

| # | Ação | Etapa | Esforço |
|---|---|---|---|
| 1 | Definir secret `ALLOWED_ORIGINS` | 2 | 5 min |
| 2 | Match estrito de `page_id` no `meta-leads-webhook` | 2 | 5 min |
| 3 | Registrar 2 funções faltantes no `config.toml` | 2 | 10 min |
| 4 | HMAC compartilhado aplicado ao `whatsapp-webhook` | 2 | 1 h |
| 5 | Teto de `steps_executed` no `automation-engine` | 2 | 30 min |
| 6 | Uniformizar `timingSafeEqual` | 2 | 10 min |
| 7 | Soft-delete no merge de leads | 2 | 1 h |
| 8 | Remover polling de `useAutomationWorker` | 2 | 15 min |
| 9 | Exigir service key nos workers (depende do #8) | 2 | 30 min |
| 10 | Remover fallback permissivo dos handshakes GET | 2 | 20 min |

---

## Próximo passo

**Etapa 3 — Banco de dados, RLS e multi-tenancy.** Entra com 8 hipóteses abertas da Etapa 2 (H-012 a H-019), das quais 5 são de banco/storage: RLS de `automation_queue`/`automation_runs`/`whatsapp_message_queue`, grants da RPC `read_secret`, visibilidade do bucket `whatsapp_media`, drift real de schema (93 migrations + `9999_reconcile_drift.sql`) e a view `automation_runs_summary`.

**Bloqueio:** a Etapa 3 depende da restauração do working tree ou do uso do clone temporário. Ver §9.1 do relatório da Etapa 2.

---

*Índice Mestre — uPixel CRM — Sistema Vibe Coding Totum v3.0*
