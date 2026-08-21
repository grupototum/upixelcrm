# Auditoria API Keys — upixelcrm

> **Modo:** somente leitura. Nenhum arquivo de produção foi alterado, nenhuma migration aplicada,
> nada commitado. Este relatório e o `SPEC-LOG-DE-ERROS.md` são os únicos arquivos criados.
>
> **Data:** 2026-08-21 · **Projeto Supabase:** `xusdhzwfkzufupjwbebt` · **Branch:** `claude/upixel-api-audit-6e4e5a`
>
> **Segredos expostos no repo:** nenhum. Varredura por `eyJ…`, `sk-…`, `AIza…`, `EAA…`, `xox[baprs]-`
> e base64 longo em `supabase/functions/**` e `src/**` retornou zero. Não há rotação D-007 pendente.
> Único literal sensível-ish: um UUID de tenant de produção hardcoded como fallback em
> `supabase/functions/whatsapp-webhook/index.ts:777` — é um ID, não uma credencial.

---

## 1. Diagnóstico do erro "Erro ao criar chave de API."

### 1.1 Resposta curta

O `INSERT` em `public.api_keys` é **negado pelo RLS**. A tabela existe em produção com
Row Level Security **habilitada e zero policies** — o que significa deny-all para `authenticated`.

Não é hipótese. É o registro que o próprio clique do Rael gravou:

```
-- public.error_logs, created_at = 2026-08-21 14:23:47.128604+00
{"code":"42501","details":null,"hint":null,
 "message":"new row violates row-level security policy for table \"api_keys\""}
```

### 1.2 Estado real medido em produção

| Tabela | RLS habilitado | nº de policies | nº de linhas |
|---|---|---|---|
| `api_keys` | ✅ sim | **0** | **0** |
| `webhook_endpoints` | ✅ sim | **0** | 0 |
| `webhook_deliveries` | — | — | **não existe no banco** |
| `error_logs` | ✅ sim | 2 | 1013 |

Duas leituras importantes dessa tabela:

- **`api_keys` tem 0 linhas.** Nunca ninguém conseguiu criar uma chave. Isso não é uma regressão
  recente — o recurso nasceu quebrado e nunca funcionou uma única vez.
- **A UI de Webhooks está quebrada pelo mesmo motivo**, e `webhook_deliveries` sequer existe.
  Quem clicar em "criar webhook" vai receber o equivalente `"Erro ao salvar webhook."`.

### 1.3 A cadeia completa, camada por camada

**Camada 1 — UI.** `src/pages/IntegrationsPage.tsx:183` abre o modal; o botão fica em
`src/components/integrations/ApiSettingsModal.tsx:147`.

**Camada 2 — handler.** `ApiSettingsModal.tsx:35-66`. O front faz a parte dele **corretamente**:

```tsx
const token = generateSecureToken("sk_live_", 32);   // crypto.getRandomValues — FIX-02 aplicado
const preview = token.slice(0, 12) + "..." + token.slice(-4);
const tokenHash = await hashToken(token);            // SHA-256 antes de gravar — FIX-03 aplicado

let row: ApiKey;
try {
  row = await integrationsRepo.createApiKey<ApiKey>({
    name: newKeyName, token_preview: preview, token_hash: tokenHash, active: true,
  });
} catch (error) {
  logger.error(error);
  toast.error("Erro ao criar chave de API.");   // ← a mensagem que o Rael viu
  return;
}
```

O `catch` recebe um `PostgrestError` completo — com `code`, `message`, `details` e `hint` — e
**descarta os quatro**, emitindo uma string fixa.

**Camada 3 — repositório.** `src/services/integrations.ts:127-131`. Não há edge function, não há RPC:

```ts
export async function createApiKey<T>(row: Record<string, unknown>): Promise<T> {
  const { data, error } = await untypedFrom("api_keys").insert(row).select().single();
  if (error) throw error;
  return data as T;
}
```

É PostgREST direto na tabela, com o JWT do usuário logado. Não existe `supabase/functions/api-keys/`
nem entrada correspondente em `supabase/config.toml`.

**Camada 4 — banco.** RLS ligada, nenhuma policy → `42501`.

**Camada 5 — por que o erro sumiu.** `src/lib/logger.ts` não escreve no console em produção
(só em `import.meta.env.DEV`); manda para `error_logs` num fire-and-forget sem `.catch`, gravando
**apenas** a coluna `message`. `client_id`, `user_id` e `context` ficam nulos/vazios. E **não existe
nenhuma UI que leia `error_logs`** — os 1013 registros só são acessíveis por query manual no
Dashboard do Supabase. Daí a sensação de "cabou".

### 1.4 Por que não existe policy no banco

`supabase/migrations/20260327_integrations.sql:53` **cria** a policy:

```sql
CREATE POLICY "Supervisors can manage API keys"
  ON public.api_keys FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'supervisor'));
```

Essa migration **nunca foi aplicada em produção**. `docs/migration-history-reconciliation.md`
documenta que `supabase db push` está travado: a tabela de histórico remota tem 36 versões sem
arquivo local correspondente (migrations aplicadas via MCP/Dashboard/SQL direto), e o `push` se
recusa a rodar enquanto isso não for reconciliado. A tabela `api_keys` existe em prod porque foi
criada fora do fluxo do repo — e o `CREATE POLICY` ficou para trás.

`docs/CLEANUP_REPORT.md:62` já tinha registrado a observação, classificando-a como "OK" por engano:

> `api_keys`, `webhook_endpoints`, `webhook_deliveries` etc. têm RLS ativo sem policy = sem acesso para anon/authenticated

Isso foi lido como "deny-by-default é seguro". É seguro **e** quebra o recurso.

### 1.5 Por que a policy do repo também não resolveria

Mesmo se `20260327_integrations.sql` fosse aplicada hoje, o Rael continuaria travado:

| Problema | Efeito |
|---|---|
| Sem `TO authenticated` | policy aplicada a todos os roles, inclusive `anon` |
| Sem `WITH CHECK` | em `FOR ALL` o Postgres reaproveita o `USING` — funciona, mas por acidente, não por desenho |
| `p.role = 'supervisor'` literal | **barra `master` e `admin`** — exatamente o usuário que reportou o bug |
| `EXISTS (SELECT … FROM profiles)` cru | ignora os helpers cacheados (`get_user_role()`, `is_master_user()`) introduzidos em `20250602180000_m55_fix_rls_n1_profiles_cache.sql` — custo N+1 por linha |
| Sem `tenant_id` na cláusula | não há isolamento multi-tenant nenhum (ver §6, achado A-04) |

O padrão canônico **realmente em vigor no banco** é o de `public.audit_log`:

```sql
-- SELECT
USING  (tenant_id IS NULL OR tenant_id = (select get_user_tenant_id()) OR (select is_master_user()))
-- INSERT
WITH CHECK ((select is_master_user()) OR tenant_id IS NULL OR tenant_id = (select get_user_tenant_id()))
-- + guard separado
USING (NOT (select is_user_blocked()))
```

`supabase/migrations/20260813070000_rls_admin_gates.sql:25-28` documenta a regra de papéis:
`'Admin' aqui = supervisor (o nome do papel de admin neste sistema), admin e master`.
A policy de `api_keys` é a única do repo que ficou fora desse padrão.

### 1.6 Todas as causas plausíveis — veredito e como verificar

| # | Causa hipotética | Veredito | Como confirmar / descartar |
|---|---|---|---|
| 1 | **RLS negando o INSERT** | ✅ **CONFIRMADA — é esta** | `select relrowsecurity, (select count(*) from pg_policies where tablename='api_keys') from pg_class where relname='api_keys';` → `true, 0`. E o log `42501` em `error_logs`. |
| 2 | **Migration aplicada em prod sem arquivo local / vice-versa** | ✅ **CONFIRMADA (causa da #1)** | `docs/migration-history-reconciliation.md`; `select * from supabase_migrations.schema_migrations where version like '20260327%';` → vazio. |
| 3 | Env var faltando (`SERVICE_ROLE_KEY`, `HMAC_SECRET`, `TENANT_ROOT_DOMAIN`) | ❌ descartada | Não há edge function no caminho. O insert usa o client do browser com `VITE_SUPABASE_PUBLISHABLE_KEY`. Nenhuma env de servidor participa. |
| 4 | Constraint de banco violada (unique / FK / check) | ❌ descartada | A tabela **não tem** unique, FK nem check além da PK. Colunas `NOT NULL` sem default (`name`, `token_preview`, `token_hash`) são todas enviadas pelo handler. Verificar: `\d+ public.api_keys`. Erro seria `23505`/`23503`/`23514`, não `42501`. |
| 5 | `verify_jwt` mal configurado em `config.toml` | ❌ não se aplica | Não existe função `api-keys`. `supabase/config.toml` só declara 7 funções, todas webhooks com `verify_jwt = false`. |
| 6 | CORS bloqueando | ❌ descartada | Falha de CORS produz `TypeError: Failed to fetch` no browser, sem `code` PostgREST. O erro logado tem `code: "42501"` — a resposta chegou. |
| 7 | Rate limit disparando (PC-029) | ❌ descartada | `_shared/rateLimit.ts` só é usado por `whatsapp-webhook` e `meta-leads-webhook`. PostgREST não passa por ele. Seria `429`. |
| 8 | `messageDedup` matando o request | ❌ descartada | `_shared/messageDedup.ts` é exclusivo do pipeline de mensagens WhatsApp/Instagram. Sem relação. |
| 9 | Coluna faltando / `types.ts` desatualizado | ❌ descartada | `src/integrations/supabase/types.ts:17-48` tem `api_keys` completa e ela **bate** com o `information_schema` de produção (8 colunas idênticas). Erro de coluna seria `42703` (ver §6, A-08). |
| 10 | Sessão expirada / JWT inválido | ❌ descartada | Seria `401`/`PGRST301`. Além disso o `SELECT` da mesma tela funciona (retorna lista vazia sem erro) — a sessão está viva. |

**Comando único que reproduz o diagnóstico inteiro:**

```sql
select c.relname, c.relrowsecurity,
       (select count(*) from pg_policies p where p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('api_keys','webhook_endpoints');
-- esperado hoje: api_keys | t | 0     ← a causa
```

**Reprodução via HTTP** (com o JWT do usuário logado; nunca use a service_role aqui):

```bash
curl -i -X POST "https://xusdhzwfkzufupjwbebt.supabase.co/rest/v1/api_keys" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"name":"teste","token_preview":"sk_live_x...abcd","token_hash":"deadbeef","active":true}'
# esperado hoje: HTTP/2 403  {"code":"42501","message":"new row violates row-level security policy…"}
```

---
## 2. Auditoria das 33 edge functions

`verify_jwt` default do Supabase é `true`. Apenas 7 funções têm entrada em `supabase/config.toml`
(todas webhooks externos, todas `verify_jwt = false` — a função valida origem por conta própria).
As outras 26 herdam `true` ("não declarado" na tabela = default true).

Legenda de erro: **A** = string solta (`new Response("Forbidden")`, sem JSON) · **B** = JSON `{error}` ·
**C** = JSON `{error, code, ...}` (nenhuma função usa `hint`; o campo extra costuma ser `request_id`/`details`/`meta_body`).

| Function | verify_jwt | usa `_shared`? | valida tenant/client_id? | rate limit? | tratamento de erro | risco |
|---|---|---|---|---|---|---|
| `admin-create-user` | não declarado (→true) | cors | ✅ role + client_id + tenant_id do criador | ❌ | B | 🟡 |
| `ai-chat` | não declarado (→true) | cors | ✅ profile.client_id/tenant_id | ❌ | B | 🟡 |
| `asaas-payment` | não declarado (→true) | cors | ✅ profile.client_id | ❌ | B | 🟡 |
| `asaas-webhook` | **false** | cors | ✅ client_id da integration | ❌ | **A** | 🟡 |
| `automation-engine` | não declarado (→true) | cors, webhook-url | ✅ ownership via automations/leads | ❌ | B | 🟡 |
| `automation-worker` | não declarado (→true) | cors | ✅ repassa tenant_id do item | ❌ | B | 🟡 |
| `check-signup-gate` | não declarado (→true) | cors | n/a (senha global) | ❌ | B | 🟢 |
| `data-deletion-callback` | **false** | cors | n/a | ❌ | HMAC `signed_request` da Meta | B | 🟢 |
| `database-backup` | não declarado (→true) | cors | ✅ role + client_id em toda query | ❌ | B | 🟡 |
| `facebook-messenger-webhook` | **false** | verifyMetaSignature (**sem cors**) | ✅ integrations.tenant_id/client_id | ❌ | ✅ HMAC, **sem dedup** apesar do comentário prometer | **A** | 🔴 |
| `facebook-page-embedded-signup` | não declarado (→true) | cors | ✅ valida contra `tenants` | ❌ | C | 🟢 |
| `google-ads` | não declarado (→true) | cors | ✅ .eq("client_id") em toda query | ❌ | C | 🟢 |
| `google-oauth` | não declarado (→true) | cors | ✅ .eq("client_id") | ❌ | B | 🟡 |
| `instagram-exchange-token` | não declarado (→true) | cors | ✅ valida contra `tenants` | ❌ | C | 🟢 |
| `instagram-proxy` | não declarado (→true) | cors | ✅ .eq("client_id") | ❌ | B | 🟡 |
| `instagram-webhook` | **false** | cors, messageDedup, verifyMetaSignature, downloadMetaMedia | ✅ tudo por client_id da integration | ❌ | ✅ HMAC + dedup real | **A** | 🟡 |
| `meta-ads` | não declarado (→true) | cors | ✅ .eq/upsert client_id | ❌ | C | 🟢 |
| `meta-ads-exchange-token` | não declarado (→true) | cors | ✅ profile.client_id | ❌ | C | 🟢 |
| `meta-leads-webhook` | **false** | cors, rateLimit | ✅ client_id da integration | ✅ (300/janela) | HMAC **reimplementado local**, não usa `_shared` | **A** | 🔴 |
| `notify-signup` | não declarado (→true) | cors | n/a (notifica masters globais) | ❌ | B | 🟢 |
| `rag-embed` | não declarado (→true) | cors | ✅ compara client_id do doc | ❌ | B | 🟢 |
| `rag-search` | não declarado (→true) | cors | ✅ p_client_id (null p/ master) | ❌ | B | 🟢 |
| `send-push` | não declarado (→true) | cors | ✅ bloqueia target_client_id cross-tenant | ❌ | B | 🔴 (ver §6 A-01) |
| `tenant-provision-domain` | não declarado (→true) | cors | ✅ compara tenant do caller | ❌ | C | 🟢 |
| `whatsapp-cloud-exchange-token` | não declarado (→true) | cors | ✅ profile.client_id | ❌ | C | 🟢 |
| `whatsapp-cloud-proxy` | não declarado (→true) | cors | ✅ valida contra `tenants` | ❌ | C | 🟢 |
| `whatsapp-cloud-webhook` | **false** | cors, messageDedup, verifyMetaSignature, downloadMetaMedia | ✅ client_id da integration | ❌ | ✅ HMAC + dedup real | **A** | 🟡 |
| `whatsapp-health-check` | não declarado (→true) | cors | n/a | ❌ | guard de cron fraco (aceita qualquer JWT logado) | B | 🟡 (candidata a morta, ver §6) |
| `whatsapp-proxy` | não declarado (→true) | cors | ✅ resolve tenant em 3 fontes, valida em `tenants` | ❌ | C | 🟢 |
| `whatsapp-queue-processor` | não declarado (→true) | cors | ✅ repassa client_id do item | ❌ | guard de cron fraco | B | 🟡 |
| `whatsapp-status-probe` | não declarado (→true) | **nenhum** | ❌ só valida formato UUID | ❌ | **sem nenhuma auth própria** | B | 🔴 (ver §6 A-02) |
| `whatsapp-templates` | não declarado (→true) | cors, logger | ✅ resolve tenant + valida em `tenants` | ❌ | **C** + request_id (padrão canônico, ver §3) | 🟢 |
| `whatsapp-webhook` | **false** | cors, messageDedup, rateLimit, verifyMetaSignature, downloadMetaMedia | ✅ client_id da integration | ✅ (600/janela) | ✅ HMAC (só rota Meta — rota Evolution sem HMAC) + dedup | **A** | 🟡 |

**Critério de risco aplicado:**
- 🔴 = webhook/endpoint sensível sem verify_jwt efetivo **e** sem HMAC/rate-limit próprio, ou dependência
  quebrada (`send-push` recebe `Bearer service_role` mas valida com `auth.getUser()`, que rejeita).
- 🟡 = padrão inconsistente com o canônico (erro em string solta, HMAC duplicado em vez de `_shared`,
  guard de cron fraco, sem rate limit num webhook público).
- 🟢 = segue o padrão canônico e tem as defesas esperadas para o que expõe.

**Contagem:** 🔴 4 · 🟡 15 · 🟢 14.

---

## 3. Padrão canônico observado

Depois de olhar as 33, `whatsapp-templates` é o melhor exemplar de "padrão bem feito" — a única
função que combina `_shared/cors.ts` + `_shared/logger.ts` (log JSON estruturado com `request_id`)
+ retorno **sempre** `{ error, code, request_id, ... }`, nunca string solta.

Por que ela é o padrão, item a item do critério pedido:

| Critério | Como `whatsapp-templates` resolve |
|---|---|
| CORS via `_shared/cors.ts` | `import { corsHeaders } from "../_shared/cors.ts"` — trata `OPTIONS` no topo do handler |
| Log via `_shared/logger.ts` | `createLogger(SERVICE, {request_id})` + `log.withContext({user_id, tenant_id, client_id, action})` propagado por todo o handler |
| Rate limit via `_shared/rateLimit.ts` | **não usa** — nenhuma função do repo combina rate limit + logger (lacuna, ver §6 A-06) |
| HMAC (`_shared/verifyMetaSignature.ts`) | n/a — não é webhook, é chamada autenticada do próprio front |
| Dedup (`_shared/messageDedup.ts`) | n/a — não recebe mensagem |
| Retorno estruturado `{error, code, hint}` | `{error, code, request_id}` em toda resposta não-2xx, com `details`/`meta_status`/`meta_body` quando aplicável — mais rico que `hint`, e é o único a fazer isso 100% do tempo |

Código real (arquivo completo, 358 linhas — `supabase/functions/whatsapp-templates/index.ts`):

```ts
// WhatsApp Templates (HSM) — proxy pra Meta Graph API.
//
// Fora da janela de 24h, WhatsApp Cloud só envia mensagens via templates
// pré-aprovados (HSM). Esta edge function permite o frontend:
//   - list      → busca templates direto da Meta + retorna status real (APPROVED/PENDING/REJECTED)
//   - create    → submete novo template pra aprovação Meta
//   - delete    → remove template (só funciona se status != APPROVED com tráfego)
//
// Observabilidade: emite logs JSON estruturados via _shared/logger.ts.
// Cada response de erro retorna um `code` específico (ex.: NOT_CONFIGURED,
// INVALID_TENANT, META_REJECTED) pra facilitar diagnóstico no Logs Explorer
// e no frontend (ver useBroadcast.ts → extractEdgeError).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { createLogger, newRequestId } from "../_shared/logger.ts";

const SERVICE = "whatsapp-templates";
const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

interface CloudConfig {
  phone_number_id?: string;
  business_account_id?: string;
  access_token?: string;
}

interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: Array<Record<string, unknown>>;
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "IN_APPEAL" | "PENDING_DELETION";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: MetaTemplateComponent[];
  rejected_reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = newRequestId();
  const log = createLogger(SERVICE, { request_id: requestId });

  try {
    // ── Autenticação ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log.warn("auth_missing_header");
      return jsonResponse({ error: "Unauthorized: missing_header", code: "MISSING_AUTH_HEADER", request_id: requestId }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      log.warn("auth_invalid_jwt", { auth_error: userError?.message });
      return jsonResponse({
        error: "Unauthorized: invalid_jwt",
        code: "INVALID_JWT",
        details: userError?.message ?? "no user",
        request_id: requestId,
      }, 401);
    }

    log.withContext({ user_id: user.id });

    // ── Profile ──
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("client_id, tenant_id, role")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      log.error("profile_not_found", { profile_error: profileError?.message });
      return jsonResponse({
        error: "Profile not found",
        code: "PROFILE_NOT_FOUND",
        details: profileError?.message,
        request_id: requestId,
      }, 404);
    }

    // ── Resolve tenant_id ──
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
    const profileRow = profile as { client_id?: string | null; tenant_id?: string | null; role?: string };
    const reqBody = req.method === "POST"
      ? await req.clone().json().catch(() => ({} as Record<string, unknown>))
      : {};
    const bodyTenantId = (reqBody as { tenant_id?: string }).tenant_id;

    let tenantId: string | null = null;
    let tenantSource: string = "none";
    if (isUuid(bodyTenantId)) { tenantId = bodyTenantId; tenantSource = "body"; }
    if (!tenantId && isUuid(profileRow.tenant_id)) { tenantId = profileRow.tenant_id!; tenantSource = "profile.tenant_id"; }
    if (!tenantId && isUuid(profileRow.client_id)) {
      const { data: t } = await userClient.from("tenants").select("id").eq("id", profileRow.client_id!).maybeSingle();
      if (t) { tenantId = profileRow.client_id!; tenantSource = "profile.client_id"; }
    }
    if (!tenantId) {
      log.error("tenant_resolution_failed", {
        role: profileRow.role,
        has_body_tenant_id: !!bodyTenantId,
        has_profile_tenant_id: !!profileRow.tenant_id,
      });
      return jsonResponse({
        error: "tenant_id requerido. Master deve mandar tenant_id no body.",
        code: "TENANT_REQUIRED",
        request_id: requestId,
      }, 400);
    }
    const clientId = tenantId;
    log.withContext({ tenant_id: tenantId, client_id: clientId });
    log.info("tenant_resolved", { source: tenantSource });

    // ── Action ──
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";
    log.withContext({ action });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Busca integration WhatsApp Cloud ──
    const { data: integration, error: integrationError } = await adminClient
      .from("integrations")
      .select("id, config, status")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp_cloud")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integrationError) {
      log.error("integration_query_failed", { db_error: integrationError.message });
      return jsonResponse({
        error: "Erro ao consultar integração.",
        code: "DB_ERROR",
        details: integrationError.message,
        request_id: requestId,
      }, 500);
    }

    if (!integration) {
      log.error("integration_not_found", { searched_client_id: clientId });
      return jsonResponse({
        error: "WhatsApp Cloud não conectado neste tenant. Conecte primeiro em Integrações > WhatsApp.",
        code: "NOT_CONFIGURED",
        request_id: requestId,
      }, 400);
    }

    if (integration.status !== "connected") {
      log.warn("integration_not_connected", { integration_id: integration.id, status: integration.status });
      return jsonResponse({
        error: `WhatsApp Cloud está com status '${integration.status}'. Reative a integração antes de usar templates.`,
        code: "INTEGRATION_INACTIVE",
        request_id: requestId,
      }, 400);
    }

    const config = integration.config as CloudConfig;
    const wabaId = config?.business_account_id;
    const accessToken = config?.access_token;
    if (!wabaId || !accessToken) {
      log.error("incomplete_credentials", {
        integration_id: integration.id,
        has_waba_id: !!wabaId,
        has_access_token: !!accessToken,
      });
      return jsonResponse({
        error: "Credenciais Meta incompletas (faltando business_account_id ou access_token).",
        code: "INCOMPLETE_CONFIG",
        request_id: requestId,
      }, 400);
    }

    // ─── LIST ───
    if (action === "list") {
      const fetchUrl = `${GRAPH_BASE}/${wabaId}/message_templates?fields=id,name,language,status,category,components,rejected_reason&limit=200`;
      log.info("meta_list_request");
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await readBody(res);

      if (!res.ok) {
        log.error("meta_list_failed", { meta_status: res.status, meta_body: data });
        return jsonResponse({
          error: "Falha ao buscar templates da Meta.",
          code: "META_LIST_FAILED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      const templates = ((data as { data?: MetaTemplate[] })?.data ?? []) as MetaTemplate[];
      log.info("meta_list_ok", { count: templates.length });

      for (const t of templates) {
        const bodyComponent = t.components.find((c) => c.type === "BODY");
        const contentText = bodyComponent?.text ?? "";
        const { error: upsertError } = await adminClient.from("whatsapp_templates").upsert({
          client_id: clientId,
          name: t.name,
          category: t.category,
          status: t.status,
          content: contentText,
          updated_at: new Date().toISOString(),
        }, { onConflict: "client_id,name" });
        if (upsertError) log.warn("upsert_template_failed", { template_name: t.name, db_error: upsertError.message });
      }

      return jsonResponse({ templates, count: templates.length, request_id: requestId });
    }

    // ─── CREATE ───
    if (action === "create") {
      const body = reqBody as {
        name?: string;
        category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
        language?: string;
        components?: MetaTemplateComponent[];
      };
      const { name, category, language = "pt_BR", components } = body;

      if (!name || !category || !components || components.length === 0) {
        log.warn("create_missing_fields", {
          has_name: !!name,
          has_category: !!category,
          components_count: components?.length ?? 0,
        });
        return jsonResponse({
          error: "Faltam campos: name, category e components (mínimo 1 com type=BODY).",
          code: "MISSING_FIELDS",
          request_id: requestId,
        }, 400);
      }

      log.info("meta_create_request", { template_name: name, category, language, components_count: components.length });

      const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, category, language, components }),
      });
      const data = await readBody(res);

      if (!res.ok) {
        const errObj = (data && typeof data === "object")
          ? (data as { error?: { message?: string; error_user_msg?: string; error_subcode?: number; code?: number } }).error
          : null;
        const msg = errObj?.error_user_msg ?? errObj?.message ?? `HTTP ${res.status}`;
        log.error("meta_create_rejected", {
          template_name: name,
          meta_status: res.status,
          meta_error_code: errObj?.code,
          meta_subcode: errObj?.error_subcode,
          meta_message: msg,
          meta_body: data,
        });
        return jsonResponse({
          error: `Meta rejeitou o template: ${msg}`,
          code: "META_REJECTED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      const created = data as { id: string; status: string; category: string };
      log.info("meta_create_ok", { template_name: name, meta_id: created.id, status: created.status });

      const bodyComponent = components.find((c) => c.type === "BODY");
      const { error: upsertError } = await adminClient.from("whatsapp_templates").upsert({
        client_id: clientId,
        name,
        category,
        status: created.status ?? "PENDING",
        content: bodyComponent?.text ?? "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,name" });
      if (upsertError) log.warn("create_cache_upsert_failed", { template_name: name, db_error: upsertError.message });

      return jsonResponse({ success: true, template: created, request_id: requestId });
    }

    // ─── DELETE ───
    if (action === "delete") {
      const body = reqBody as { name?: string };
      const { name } = body;
      if (!name) {
        log.warn("delete_missing_name");
        return jsonResponse({ error: "Faltando 'name'.", code: "MISSING_NAME", request_id: requestId }, 400);
      }

      log.info("meta_delete_request", { template_name: name });

      const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readBody(res);

      if (!res.ok) {
        log.error("meta_delete_rejected", { template_name: name, meta_status: res.status, meta_body: data });
        return jsonResponse({
          error: "Meta rejeitou a remoção.",
          code: "META_DELETE_REJECTED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      await adminClient.from("whatsapp_templates").delete().eq("client_id", clientId).eq("name", name);
      log.info("meta_delete_ok", { template_name: name });
      return jsonResponse({ success: true, request_id: requestId });
    }

    log.warn("unknown_action", { received_action: action });
    return jsonResponse({ error: `Unknown action: ${action}`, code: "UNKNOWN_ACTION", request_id: requestId }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.fatal("unhandled_exception", { error_message: message, stack: stack?.split("\n").slice(0, 5).join(" | ") });
    return jsonResponse({
      error: message,
      code: "UNHANDLED_EXCEPTION",
      request_id: requestId,
    }, 500);
  }
});
```

**Lacuna que fica registrada:** nenhuma função do repo combina `rateLimit` + `logger`. As duas únicas
que usam rate limit (`whatsapp-webhook`, `meta-leads-webhook`) usam `console.*` e erro em string solta.
Um template ideal futuro seria `whatsapp-templates` + `_shared/rateLimit.ts`.

---
## 4. Runbook — como criar API keys corretamente

### O que DEVERIA acontecer

```
Frontend                              Backend (PostgREST direto, sem edge function)
────────────────────────────────────  ──────────────────────────────────────────────
1. Usuário clica "Criar chave"
2. generateSecureToken("sk_live_",32)  (crypto.getRandomValues — já correto hoje)
3. hashToken(token) → SHA-256          (já correto hoje)
4. supabase.from("api_keys").insert    → valida sessão (JWT) ✅ sempre funciona
   ({name, token_preview, token_hash}) → valida tenant_id/client_id do profile
                                        → checa RLS: role é supervisor/admin/master
                                          E tenant bate                          ← FALTA
                                        → INSERT com tenant_id do profile        ← FALTA
                                        → retorna a linha criada
5. Front recebe a linha
6. Exibe token em plaintext UMA VEZ,
   com botão copiar + aviso "não verá
   novamente"                          (já correto hoje)
7. Após fechar o aviso, só token_preview
   fica visível dali pra frente         (já correto hoje)
```

### O que ESTÁ acontecendo hoje

```
Frontend                              Backend
────────────────────────────────────  ──────────────────────────────────────────────
1-3. idênticos ao esperado             (sem problema)
4. supabase.from("api_keys").insert    → valida sessão ✅
                                        → RLS: 0 policies → DENY sempre        ← GAP
                                        → retorna 42501
5. catch(error) descarta o PostgrestError, exibe "Erro ao criar chave de API."
   Nenhum usuário master, admin ou supervisor jamais consegue criar uma chave.
```

### O gap exato

Não é um bug de lógica de negócio nem de UI — é **infraestrutura ausente**: falta a policy de
RLS em produção (§1.4) e, mesmo que existisse, ela precisa ser reescrita no padrão `tenant_id`
(§1.5) para não travar o próprio master. Nenhuma linha do handler React precisa mudar.

---

## 5. Landmines (a evitar em qualquer fix)

| Landmine do prompt original | Situação real, confirmada nesta auditoria |
|---|---|
| Multi-tenant por subdomínio → toda insert precisa `tenant_id` | ✅ Confirmado, e é justamente o que falta em `api_keys`/`webhook_endpoints` (só têm `client_id TEXT DEFAULT 'c1'`, sem tenant_id). Qualquer fix de RLS deve adicionar a coluna, não só a policy. |
| RLS ativa em todas as tabelas → não bypassar com service_role no client | ✅ Confirmado — nenhuma chamada do client React usa service_role; só edge functions o fazem, sempre com `Deno.env.get`. |
| `types.ts` desatualizado (audit #14) — não confiar cegamente | ⚠️ **Desatualizado para este caso específico.** `api_keys` e `error_logs` **já estão** tipadas em `src/integrations/supabase/types.ts` e batem com o `information_schema` real. `untypedFrom("api_keys")` em `src/services/integrations.ts:128` é hoje desnecessário — remove checagem estática sem necessidade real. A landmine continua válida para outras tabelas não auditadas aqui. |
| 36 migrations aplicadas em prod sem arquivo local (audit #18) | ✅ Confirmado, é a causa raiz de #1.4 acima. Qualquer nova migration de `api_keys` deve primeiro rodar `supabase migration repair` (ver `docs/migration-history-reconciliation.md`) — do contrário `db push` vai falhar de novo. |
| Sem Sentry / error tracking (audit #12) — por isso a mensagem chega genérica | ✅ Confirmado, zero ocorrências de Sentry/LogRocket/Datadog/Bugsnag no repo. É a motivação do Deliverable 7 (`SPEC-LOG-DE-ERROS.md`). |
| SW cache bumpa no dashboard — se mexer em UI de API, incrementar cache version | Não verificado nesta rodada (fora do escopo de leitura desta auditoria); manter como lembrete para quem for implementar o fix de UI. |
| Cookie SSO `.grupototum.com` obrigatório em produção | Não impacta este bug — o fluxo quebra em RLS, antes de qualquer preocupação de cookie cross-domain. Mantido como landmine geral para outras mudanças de auth. |

---

## 6. Achados novos

### 🔴 Críticos

**A-01 — `send-push` provavelmente nunca envia notificação.**
`supabase/functions/whatsapp-webhook/index.ts:24` e `instagram-webhook/index.ts:17` chamam
`send-push` com `Authorization: Bearer <SERVICE_ROLE_KEY>`. Mas `send-push/index.ts:88` autentica
com `userClient.auth.getUser()`, que **rejeita** um JWT de service_role (não tem `sub` de usuário).
A chamada é fire-and-forget com `catch` silencioso — a falha nunca aparece em lugar nenhum. Efeito
prático: push notifications de novas mensagens WhatsApp/Instagram provavelmente nunca chegam.
**Como confirmar:** invocar manualmente `send-push` com um bearer de service_role e observar 401;
ou checar se há usuários reclamando de push ausente.

**A-02 — `whatsapp-status-probe` sem nenhuma verificação de auth própria.**
`supabase/functions/whatsapp-status-probe/index.ts:41-50` cria client com `SERVICE_ROLE_KEY` e lê
`integrations` a partir de query param, sem checar `Authorization` internamente. Hoje o gateway
Supabase segura (default `verify_jwt=true`, não declarada em `config.toml`), mas o comentário no
topo do arquivo já afirma (incorretamente) que é um "endpoint público" — se alguém "corrigir" isso
adicionando `verify_jwt = false`, vira IDOR: qualquer request não-autenticada lê status de
integração de qualquer client_id.

**A-03 — CORS `*` em 31 das 33 funções.**
`supabase/functions/_shared/cors.ts:2`: `Deno.env.get("ALLOWED_ORIGINS") || "*"`. A variável
`ALLOWED_ORIGINS` **não existe em nenhum `.env.example`** do repo — na prática toda função que
importa `_shared/cors` roda com `Access-Control-Allow-Origin: *`, incluindo `admin-create-user`,
`database-backup`, `asaas-payment`, `tenant-provision-domain`. Bônus: mesmo se a var fosse setada,
o nome no plural engana — o header só aceita uma origem por vez.

### 🟠 Altos

**A-04 — `api_keys`/`webhook_endpoints` sem `tenant_id` e sem consumidor.**
As duas tabelas têm `client_id TEXT NOT NULL DEFAULT 'c1'` (não UUID, sem FK para `tenants`) —
mesmo depois de corrigido o RLS, os 3 tenants de produção compartilhariam efetivamente o mesmo
namespace se o default nunca for sobrescrito no insert. Mais grave: **nenhuma edge function e
nenhuma rota consomem `api_keys`/`token_hash`** — grep em `src/` e `supabase/functions/` só
encontra o próprio modal e o repositório de dados. A "API REST" que essas chaves autenticariam
não existe hoje. Criar uma chave, mesmo corrigido o bug, não dá acesso a nada.
*(Registrado como achado, não como escopo do fix — decisão do Rael.)*

**A-05 — Segurança duplicada e divergente entre webhooks.**
`meta-leads-webhook/index.ts:27` reimplementa `verifyMetaSignature` do zero em vez de importar de
`_shared/verifyMetaSignature.ts` (usado corretamente por `whatsapp-webhook`, `whatsapp-cloud-webhook`,
`instagram-webhook`, `facebook-messenger-webhook`). Divergência em código de assinatura HMAC é
risco de segurança por si só. Adicionalmente, o bloco "resolver tenant_id" (body → profile.tenant_id
→ profile.client_id validado contra `tenants`) está copiado quase idêntico em 5 funções
(`whatsapp-templates`, `whatsapp-cloud-proxy`, `instagram-exchange-token`,
`facebook-page-embedded-signup`, `whatsapp-proxy`) — é o coração do isolamento multi-tenant,
deveria estar em `_shared/resolveTenant.ts`. `findOrCreateLead` e `upsertConversationAndMessage`
também estão triplicados (`whatsapp-webhook`, `whatsapp-cloud-webhook`, `instagram-webhook`).

**A-06 — Policy de INSERT de `error_logs` está aberta.**
Medido em produção: `error_logs` tem policy `"Service role insert error_logs"` com
`with_check = true` e `roles = {public}` — ou seja, **qualquer requisição, autenticada ou não**,
pode inserir na tabela de log. Isso é relevante para a Fase 1 da spec de Log de Erros (§ SPEC,
fecha para `authenticated` + tenant scoping).

### 🟡 Médios

**A-07 — Env vars lidas e nunca declaradas em nenhum `.env.example`:**
`ALLOWED_ORIGINS` (31 funções via `_shared/cors.ts`), `WHATSAPP_APP_SECRET` (`whatsapp-webhook:13`,
a variável **primária** de verificação HMAC do maior webhook do sistema), `RATE_LIMIT_WHATSAPP_WEBHOOK`
e `RATE_LIMIT_META_LEADS_WEBHOOK`. Sem documentação, é fácil essas ficarem sem valor em um novo
ambiente/deploy e a defesa correspondente silenciosamente não funcionar (rate limit é fail-open por
design em `_shared/rateLimit.ts`, então a ausência não quebra a função — só remove a proteção).

**A-08 — Guard de cron fraco em 3 funções.**
`automation-worker:21`, `whatsapp-health-check:86`, `whatsapp-queue-processor:102` checam apenas
`if (!bearer || bearer === ANON_KEY) → 403` — isso aceita **qualquer JWT de usuário autenticado**,
não apenas o service_role esperado pelo cron. `automation-engine:138` faz correto
(`bearer === serviceKey`). Os comentários no topo de `whatsapp-queue-processor` e
`whatsapp-health-check` também afirmam "verify_jwt: false — função interna", mas nenhuma das duas
está em `supabase/config.toml` — herdam `verify_jwt=true` de fato.

**A-09 — Handshake de verificação de webhook sem amarrar ao `integration_id` da URL.**
`whatsapp-cloud-webhook:166-172`, `facebook-messenger-webhook:44-46`, `meta-leads-webhook:73-75`
aceitam o `hub.verify_token` do handshake da Meta se **qualquer** tenant no banco tiver aquele
token cadastrado — sem checar que é o tenant dono daquela URL específica de callback.

**A-10 — Candidatas a função morta:** `whatsapp-status-probe` (zero refs em `src/`, sem cron, e não
está em `config.toml` — logo nem monitor externo consegue chamá-la sem JWT) e `whatsapp-health-check`
(zero refs em `src/` e sem `cron.schedule` correspondente nas migrations).

**A-11 — `tags.client_id does not exist` disparando ao vivo hoje.**
No mesmo dump de `error_logs` usado para diagnosticar o bug de `api_keys`, há **dezenas** de
ocorrências repetidas hoje (2026-08-21) de: `{"code":"42703","message":"column tags.client_id does not exist"}`.
É outro caso de schema drift ativo — algum código ainda referencia `tags.client_id`, mas a coluna
real deve ter outro nome ou não existe. Fora do escopo desta auditoria (que é sobre API keys), mas
registrado por severidade e recorrência.

**A-12 — `ErrorBoundary` montado em duplicidade.** `src/main.tsx:10` envolve `<App/>` e
`src/App.tsx:207` envolve o conteúdo de novo — dois boundaries aninhados fazendo a mesma coisa.
Não é bug funcional, mas é código redundante a limpar quando a Fase 2 da spec mexer no arquivo.

### ℹ️ Informativo

- Nenhum segredo real exposto no repo (varredura completa, ver topo do documento).
- Versões da Graph API divergentes entre funções: `v22.0` (`whatsapp-templates`,
  `whatsapp-cloud-webhook`, `_shared`) vs `v21.0` (`whatsapp-webhook:207`).
- `automation-worker` e `whatsapp-queue-processor` estão confirmadamente vivos via
  `cron.schedule` nas migrations — não são candidatas a morta.

---

## 7. Próximos passos recomendados

- [ ] **Fix imediato do erro** — migration nova (não aplicar nesta rodada; só sugerida aqui):
  ```sql
  -- Reconcilia o drift: espelha o CREATE TABLE real de produção antes de alterar
  -- (ver docs/migration-history-reconciliation.md — rodar `supabase migration repair` antes do push)
  alter table public.api_keys add column if not exists tenant_id uuid references public.tenants(id);
  alter table public.webhook_endpoints add column if not exists tenant_id uuid references public.tenants(id);

  drop policy if exists "Supervisors can manage API keys" on public.api_keys;
  create policy "Tenant scoped api_keys access"
    on public.api_keys for all to authenticated
    using ( (select is_master_user())
            or (tenant_id = (select get_user_tenant_id())
                and (select get_user_role()) in ('supervisor','admin')) )
    with check ( (select is_master_user())
                 or (tenant_id = (select get_user_tenant_id())
                     and (select get_user_role()) in ('supervisor','admin')) );
  -- mesma policy, mesmo padrão, para webhook_endpoints e webhook_deliveries
  ```
  mais o desembrulho do erro no handler:
  ```tsx
  } catch (error) {
    logger.error(error);
    const pgError = error as { code?: string; message?: string; hint?: string };
    toast.error(
      pgError.code === "42501"
        ? "Sem permissão para criar chave de API neste tenant."
        : `Erro ao criar chave de API${pgError.message ? `: ${pgError.message}` : "."}`
    );
    return;
  }
  ```
- [ ] **Feature Log de Erros** — ver `SPEC-LOG-DE-ERROS.md`.
- [ ] **Cleanup das edge functions 🟡 e 🔴** — priorizar A-01 (`send-push`) e A-02
  (`whatsapp-status-probe`) por serem os únicos com efeito de segurança/funcionalidade já hoje,
  não só potencial.
- [ ] **Atualização de `types.ts`** — não é urgente para `api_keys`/`error_logs` (já corretas);
  revisar as demais tabelas citadas em `src/services/integrations.ts:116-117` como "fora dos tipos".
- [ ] **Baseline de observabilidade** — Log de Erros interno (Deliverable 7) cobre o caso imediato;
  avaliar Sentry como complemento para stack traces de produção fora do escopo desta rodada.
