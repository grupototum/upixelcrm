# Snapshot de Camadas — uPixel CRM

**Data:** 2026-08-09
**Base medida:** `origin/main` @ `4d376ad` (clone restaurado — ver incidente no índice mestre)
**Método:** contagem real de linhas, `grep` sobre migrations e workflows, leitura dos arquivos citados.

> **Nota de procedência.** Os IDs `PC-009/010/013/015/016/017`, `H-001…H-008`, `BT-002…BT-028` e `RP-001` vêm do relatório da Etapa 1, que **foi perdido** e não existe no remoto (ver `00-MASTER-AUDIT-INDEX.md`). Eles são preservados como rótulos de rastreio, mas **não pude reler a evidência original**. Os IDs `PC-026…PC-041` são desta auditoria e estão verificados contra o código.
>
> Onde a medição real diverge do que foi passado, a tabela traz o número medido e a divergência aparece em §2.

---

## 1. Tabela de camadas

| Camada | Arquivos principais | Estado atual | Dívida técnica |
|---|---|---|---|
| **Frontend — Contextos** | `AppContext.tsx` (**1024L**), `AuthContext.tsx` (225L), `TenantContext.tsx` (108L), `SelectionContext.tsx` (105L) | ⚠️ God Context — 1 arquivo concentra CRM + automações + tags + pipelines | PC-015: dividir em `CRMCtx` / `TaskCtx` / `AutoCtx` |
| **Frontend — Páginas** | `InboxPage` (**1633L**), `ImportPage` (**1628L**), `UsersPage` (822L), `LeadProfilePage` (789L), `CRMPage` (720L), `DatabaseBackupPage` (668L) — 14.167L em `src/pages/` | 🔴 God Pages — 6 páginas passam de 650L | PC-016: extrair hooks (`useInbox.ts` já tem 993L — o hook virou God Hook também) |
| **Frontend — Landing** | `LandingPage.tsx` (658L) + `LandingPageEN.tsx` (**514L**) | 🔴 EN é cópia quase integral da PT; CTAs mortos | PC-009 / PC-010 |
| **Frontend — Componentes** | 22.178L em `src/components/`; maiores: `WhatsAppManagement` (767L), `BroadcastConfigModal` (673L), `AutomationSidebar` (628L) | ⚠️ Modais monolíticos | PC-016 (mesma classe) |
| **API — Edge Functions** | **33** funções Deno (não 34 — a 34ª entrada é `_shared/`) | 🔴 CORS `*` efetivo, zero rate limit, `whatsapp-webhook` sem HMAC | PC-026 (**corrigido nesta sessão**), PC-027, PC-028, PC-029, PC-030, PC-031 |
| **API — Regras de Negócio** | 3 motores de automação: `bots` (dentro do `whatsapp-webhook`), `automations` (`automation-engine`), `automation_rules` (frontend) | ⚠️ Espalhado e triplicado | BT-002…BT-006; ver D-1…D-5 na Etapa 2 |
| **Banco — Schema** | **93** migrations (**28** com nome UUID gerado pelo Lovable, **65** semânticas) + `9999_reconcile_drift.sql` | ⚠️ Drift assumido; `supabase db push` não roda em CI | PC-017, **PC-040** |
| **Banco — RLS** | RLS dupla (`client_id` + `tenant_id`); **258** `CREATE POLICY` e **130** `DROP POLICY` ao longo das migrations; **55** `ENABLE ROW LEVEL SECURITY` | ⚠️ Churn alto — o número final de políticas vivas só sai consultando `pg_policies` | RP-001 |
| **Banco — Storage** | Buckets `whatsapp_media`, `sequence_files`, `media` | 🔴 **`whatsapp_media` é PÚBLICO** (`public = true`, migration `20260331184150`) | **PC-038** — confirma H-005/H-014/RP-007 |
| **Auth** | Supabase Auth + RBAC. `AuthContext.tsx:29` declara **6** roles; `admin-create-user:54` aceita **4**; migrations referenciam **4** | ⚠️ Roles fantasma: `admin` e `gerente` existem no tipo e em `usePermissions.ts:70,80` mas não são criáveis | H-001, BT-017, BT-020, **PC-039** |
| **Multi-Tenancy** | `TenantContext` (108L) + tabela `tenants` + RLS por `client_id`/`tenant_id`; resolução por subdomínio | ❓ Não auditado a fundo — mas 33/33 edge functions rodam com service role, acima do RLS | H-002, RP-001, BT-021 |
| **Hosting / Deploy** | **Frontend: Vercel** (integração GitHub↔Vercel). **Edge functions: Supabase Cloud** (`--project-ref xusdhzwfkzufupjwbebt`). `deploy/nginx.conf` é legado da VPS | ⚠️ **A tabela de entrada dizia "GitHub Actions → SSH → nginx" — isso não é mais verdade**: o job `deploy-vps` foi removido em 2026-07-19 (SSH quebrado) | **PC-041**, H-007, H-008 |
| **Supabase self-hosted** | `deploy/selfhosted/` (docker-compose, Caddyfile/nginx de exemplo, dump/restore) | ⚠️ **Scaffold**, não destino ativo. O CI ainda entrega para o Supabase **Cloud** | **PC-041** — briefing da sessão descreve `upixel.grupototum.com` como stack atual; o código diz outra coisa |
| **CI/CD** | `.github/workflows/deploy.yml` — único workflow: `detect-changes` → `deploy-functions` + `ci` (lint/test/build) → `summary` | ⚠️ **Nenhum passo aplica migrations.** Banco é 100% manual | PC-017, BT-015, **PC-040** |
| **Segurança / TLS** | `deploy/nginx.conf`: `listen 80` apenas, `server_name evolution.grupototum.com`. Nenhuma diretiva `ssl_*` no repositório | ❓ TLS terminado fora do repo (Vercel/Cloudflare/Caddy). Não verificável só pelo código | BT-018, PC-013 |
| **Rate Limiting** | Nenhum. `grep -rE "rate.?limit"` em `supabase/functions/` → **0 ocorrências** | 🔴 Confirmado ausente | PC-029 |
| **Cache / CDN** | Nenhum header de cache no `nginx.conf`; nenhuma config de CDN no repositório. `scripts/bump-sw-cache.mjs` sugere service worker com versionamento manual | ❓ Vercel aplica CDN por padrão — fora do repo | — |
| **Monitoramento** | Nenhum. Sem Sentry, Datadog, PostHog, New Relic ou Logtail em `src/` ou `package.json` | 🔴 Confirmado ausente. O outage de ~1 mês na `automation_queue` (mai→jun) passou despercebido por isso | BT-028, RP-006 |

**Legenda:** 🔴 crítico/confirmado ruim · ⚠️ atenção · ❓ não auditado a fundo (fora do escopo das Etapas 1–2)

---

## 2. Correções à tabela de entrada

| Linha original | Medido agora | Comentário |
|---|---|---|
| AppContext (914L) | **1024L** | Cresceu ~110 linhas |
| InboxPage (1365L) | **1633L** | Cresceu ~270 linhas |
| ImportPage (762L) | **1628L** | **Mais que dobrou.** É a 2ª maior página, não a 3ª |
| UsersPage (845L) | **822L** | Praticamente igual |
| "514L duplicadas" na Landing | `LandingPageEN.tsx` **tem** 514L; a PT tem 658L | O número era o tamanho do arquivo EN, não o volume duplicado. A duplicação real precisa de diff semântico |
| 34 edge functions | **33** funções + `_shared/` | A 34ª entrada do diretório é a pasta compartilhada |
| 84 migrations, 36 órfãs | **93** migrations, **28** com nome UUID | `main` avançou; "órfãs" aqui é lido como as geradas automaticamente pelo Lovable |
| "134+ políticas" | **258** `CREATE` / **130** `DROP` nas migrations | O número de políticas *vivas* só sai de `pg_policies` — as migrations recriam políticas repetidamente |
| RBAC 6 roles | **6 no tipo TS, 4 no sistema** | Ver PC-039 |
| Bucket whatsapp_media "❓ não auditado" | **PÚBLICO — confirmado** | Ver PC-038 |
| Deploy "GitHub Actions → SSH → nginx" | **Vercel (frontend) + Supabase Cloud (functions)** | O job SSH foi removido em 2026-07-19 por estar quebrado |
| Stack "Supabase self-hosted" | **Cloud em produção; self-hosted é scaffold** | Ver PC-041 |

---

## 3. Achados novos registrados neste snapshot

### PC-038 — Bucket `whatsapp_media` é público · **ALTO**

`supabase/migrations/20260331184150_….sql:3`

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp_media', 'whatsapp_media', true)
```

Toda mídia recebida por WhatsApp — de **todos os tenants** — fica acessível por URL sem autenticação. Os nomes de arquivo são `${Date.now()}_${Math.random().toString(36).substring(2,8)}.ext` (`whatsapp_webhook/index.ts:158`, `whatsapp-cloud-webhook/index.ts:93`): ~2 bilhões de combinações por milissegundo de timestamp, e o timestamp é inferível pela data da conversa. Não é força bruta trivial, mas também não é segredo — e uma URL vazada é permanente.

Fotos de documentos, comprovantes e áudios de clientes de um tenant são recuperáveis por qualquer um que obtenha (ou adivinhe) a URL. Confirma H-005 / H-014 / RP-007.

### PC-039 — Roles fantasma no RBAC · **MÉDIO**

`src/contexts/AuthContext.tsx:29` declara:

```ts
role: "master" | "admin" | "supervisor" | "gerente" | "vendedor" | "atendente";
```

Mas `admin-create-user/index.ts:54` só aceita `["master","supervisor","atendente","vendedor"]`, e as migrations referenciam apenas esses mesmos 4. `admin` e `gerente` não são criáveis pela aplicação.

Pior: `src/hooks/usePermissions.ts:70,80` concede acesso amplo a `role === "admin"`. Se alguém inserir `role = 'admin'` direto no banco (ou se uma migration futura relaxar a constraint), esse usuário recebe permissões que nunca passaram por revisão. É uma porta de escalada esperando por um `UPDATE`.

### PC-040 — CI não aplica migrations · **MÉDIO**

`.github/workflows/deploy.yml` tem 4 jobs: `detect-changes`, `deploy-functions` (Supabase Cloud), `ci` (lint + vitest + build) e `summary`. **Nenhum executa `supabase db push` ou equivalente.**

Edge functions são entregues automaticamente no push para `main`; o schema que elas dependem, não. É exatamente o cenário que produz o drift documentado em `9999_reconcile_drift.sql` e os fallbacks silenciosos de `safeInsertConversation`/`safeInsertMessage` (PC/RP-003 da Etapa 2).

### PC-041 — Documentação diverge do deploy real · **MÉDIO**

O briefing desta auditoria e o `CLAUDE.md` descrevem "Supabase self-hosted (`upixel.grupototum.com`)". O código diz outra coisa:

- `deploy.yml:81` → `PROJECT_REF="xusdhzwfkzufupjwbebt"` (Supabase **Cloud**)
- `supabase/config.toml:1` → mesmo `project_id`
- `deploy.yml:3-8` → frontend na **Vercel**; job VPS/SSH removido em 2026-07-19
- `deploy/selfhosted/` → docker-compose + Caddyfile **de exemplo**, dump/restore — scaffold da migração, commitado no HEAD (`docs+infra: Fase 1 adiantada`)

Auditar contra a arquitetura errada produz achados errados. Antes da Etapa 5 é preciso fixar qual é o alvo real.

---

## 4. Próximas 3 etapas prioritárias

### Etapa 3 — Banco de dados, RLS e Multi-Tenancy · **prioridade máxima**

> Auditor sênior de banco. Alvo: PostgreSQL do uPixel CRM, 93 migrations em `supabase/migrations/`.
> Contexto: 33/33 edge functions rodam com `SUPABASE_SERVICE_ROLE_KEY`, acima do RLS — o RLS só protege o acesso direto do frontend. RLS é dupla (`client_id` + `tenant_id`).
> Verifique: (a) RLS de `automation_queue`, `automation_runs`, `whatsapp_message_queue`, `automation_executions` — H-012 e RP-001 dizem que `automation_queue` não tem `client_id`; (b) a view `automation_runs_summary` filtra por tenant? (H-016); (c) grants e `SECURITY DEFINER` da RPC `read_secret` (H-013) e de `increment_client_credits`; (d) políticas do bucket `whatsapp_media`, que é público — PC-038; (e) drift real: rode o inventário de `pg_policies`/`information_schema` contra o que as 93 migrations declaram, e avalie `9999_reconcile_drift.sql` (H-015); (f) a constraint de `profiles.role` aceita `admin`/`gerente`? — PC-039.
> Entregável: `audit/03-banco-rls-multitenancy.md`, mesmo formato (PC/RP/H/Quick Wins/Backlog/Decisões humanas). Não altere schema.

### Etapa 4 — Frontend, estado e experiência

> Auditor sênior de frontend React. Alvo: `src/` (287 arquivos, 14.167L em páginas, 22.178L em componentes).
> Leia: `AppContext.tsx` (1024L), `useInbox.ts` (993L), `InboxPage.tsx` (1633L), `ImportPage.tsx` (1628L), `LandingPage.tsx` + `LandingPageEN.tsx`, `usePermissions.ts`, `useWhatsAppIntegration.ts`.
> Verifique: (a) PC-012 — o filtro de reconexão WhatsApp ainda está errado? (H-017); (b) o builder visual permite salvar grafos cíclicos, que causam invocação infinita no engine? (H-018, PC-033); (c) PC-011 — `ComplexTab.handleCreateNew` insere no banco antes do wizard; (d) RP-009 — 37 chamadas `functions.invoke` diretas vs. 12 via `invokeEdge`; (e) PC-039 — `usePermissions` concede acesso a role inexistente; (f) duplicação real entre as duas landings.
> Entregável: `audit/04-frontend-estado.md`.

### Etapa 5 — Infra, secrets e deploy

> Auditor sênior de infraestrutura. **Comece resolvendo PC-041**: confirme se produção é Supabase Cloud (`xusdhzwfkzufupjwbebt`) ou self-hosted (`upixel.grupototum.com`), e onde a Vercel entra. Auditar a arquitetura errada invalida o resto.
> Depois verifique: (a) H-019 — quais secrets de edge estão realmente setados: `WHATSAPP_APP_SECRET` (**novo, exigido pelo fix PC-026 — sem ele o inbound Meta Official para**), `META_APP_SECRET`, `ASAAS_WEBHOOK_TOKEN`, `ALLOWED_ORIGINS`, `SDR_PILOT_TENANT_ID`; (b) PC-040 — como as migrations chegam em produção hoje; (c) terminação TLS e headers de segurança (o `nginx.conf` do repo só escuta na 80 e é legado); (d) backup/restore: `deploy/selfhosted/scripts/dump.sh` é executado por alguém?; (e) BT-028 — instrumentar monitoramento, começando pela profundidade da `automation_queue` (o outage de mai→jun passou um mês invisível).
> Entregável: `audit/05-infra-secrets-deploy.md`.

---

## 5. Como este snapshot foi medido

```bash
wc -l src/contexts/*.tsx src/pages/*.tsx src/hooks/*.ts
find src/components -name "*.tsx" | xargs wc -l
ls supabase/functions | grep -v '^_' | wc -l          # 33
ls supabase/migrations | wc -l                         # 93
ls supabase/migrations | grep -cE '^[0-9]{14}_[0-9a-f]{8}-'   # 28 UUID
grep -rho "CREATE POLICY" supabase/migrations/ | wc -l # 258
grep -rho "DROP POLICY"   supabase/migrations/ | wc -l # 130
grep -rn "storage.buckets" supabase/migrations/        # bucket público
grep -rlE "sentry|datadog|posthog|newrelic|logtail" src/ package.json   # vazio
grep -rE "rate.?limit" supabase/functions/             # vazio
```

Camadas marcadas ❓ não foram auditadas a fundo — o escopo das Etapas 1–2 parou na camada de API. Elas entram nas Etapas 3–5 acima.

---

*Snapshot de Camadas — uPixel CRM — Sistema Vibe Coding Totum v3.0 — 2026-08-09*
