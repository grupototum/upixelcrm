# Facebook Page / Messenger — Plano do Frontend

**Status:** Backend pronto (não deployado). Frontend pendente.
**Branch:** `main`
**Última atualização:** 2026-05-19
**Mapeamento ao `API Meta/ROADMAP-integrações-self-service.md` (notas operacionais locais, não versionadas):**
cobre **Fase 1** (backend + secrets) + **Fase 2.1 e 2.2** (UI de Integrações + fluxo Facebook).
Fase 3 (App Review), 4 (token refresher), 5 (send API) ficam fora desta sessão.

> **Divergência declarada vs roadmap (Fase 1.1):** o roadmap propõe `facebook-oauth.ts`
> (redirect OAuth clássico). Após review de segurança nesta sessão, foi decidido com o
> usuário usar **Embedded Signup** (mesmo padrão de `whatsapp-embedded-signup` e
> `meta-oauth`). Justificativa: redirect OAuth proposto tinha 5 issues de segurança
> (state CSRF fraco, sem validação multi-tenant no callback, App Secret na URL,
> ownership check ausente em status/refresh) e era inconsistente com o resto do
> codebase. O arquivo `facebook-oauth.ts` original em `API Meta/` fica como referência
> histórica, **não vai pra produção**.

---

## Estado atual

### ✅ Backend pronto no repo (NÃO deployado ainda)

| Arquivo | Função |
|---|---|
| `supabase/functions/facebook-messenger-webhook/index.ts` | Recebe webhook do Messenger (v2 com fixes de segurança) |
| `supabase/functions/facebook-page-embedded-signup/index.ts` | Conexão via Embedded Signup (padrão consistente com whatsapp/instagram) |

### 🚧 Pendências de deploy (você)

1. **Secrets Supabase** — verificar/adicionar:
   - `FACEBOOK_APP_SECRET` (preferencialmente — webhook usa isso pra HMAC; `META_APP_SECRET` também é aceito como fallback)
   - `META_APP_ID` ✓ (já configurado para outras integrações)
   - `META_APP_SECRET` ✓ (já configurado)
   - `META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID` — config_id do "Facebook Login for Business" no Meta App
   - `APP_ROOT_DOMAIN` ✓ (já configurado)

2. **Deploy das duas edge functions**:
   ```bash
   supabase functions deploy facebook-messenger-webhook --no-verify-jwt
   supabase functions deploy facebook-page-embedded-signup
   ```

3. **Meta App configuration** (https://developers.facebook.com/apps/911162198384188/):
   - Criar/confirmar **Facebook Login for Business config** para Facebook Pages
   - Adicionar `https://upixel.app/oauth/facebook-page/connect` em "Valid OAuth Redirect URIs"
   - Permissões aprovadas: `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`

4. **Update da integração existente "Totum USA"**:
   - Após deploy da v2 do webhook, a integração precisa ter o `webhook_verify_token` setado corretamente.
   - Reconectar via UI nova (Embedded Signup) é o caminho mais seguro — vai gerar verify_token novo e re-subscrever.
   - Alternativa: SQL UPDATE setando o verify_token manualmente — mas precisa rodar com cuidado (No-Fly Zone — dados em prod).

---

## Frontend — o que precisa ser criado (próxima sessão)

### Arquivos a criar/editar

| Arquivo | Tipo | Referência (copiar padrão) |
|---|---|---|
| `src/components/facebook-page/FacebookPageConnectModal.tsx` | NOVO | [src/components/whatsapp/CloudConnectModal.tsx](src/components/whatsapp/CloudConnectModal.tsx) |
| `src/hooks/useFacebookPageIntegration.ts` | NOVO | [src/hooks/useInstagramIntegration.ts](src/hooks/useInstagramIntegration.ts) |
| `src/pages/FacebookPagePage.tsx` | NOVO | [src/pages/InstagramPage.tsx](src/pages/InstagramPage.tsx) |
| `src/App.tsx` | EDIT | adicionar rota `/facebook-page` |
| `src/pages/IntegrationsPage.tsx` | EDIT | adicionar entrada `facebook_page` no array de providers |
| `public/oauth/facebook-page/connect/index.html` | NOVO | popup page no root domain (similar ao já existente para whatsapp/instagram) |

### Fluxo de conexão (Embedded Signup)

```
User no tenant (acme.upixel.app)
  ↓ clica "Conectar Facebook Page"
useFacebookPageIntegration.connect()
  ↓ POST /functions/v1/facebook-page-embedded-signup?action=initiate
  ↓ payload: { tenant: "acme" }
  ↓ response: { popup_url, state }
window.open(popup_url, "fb-page", "popup")
  ↓ popup em upixel.app/oauth/facebook-page/connect?state=...
  ↓ carrega FB SDK, chama FB.login({ scope: REQUIRED_SCOPES })
  ↓ user autoriza, FB SDK retorna { authResponse: { code } }
POST /functions/v1/facebook-page-embedded-signup?action=list
  ↓ payload: { state, code }
  ↓ response: { pages: [{id, name, category}, ...] }
  ↓ popup mostra UI de seleção de páginas
User seleciona páginas → confirma
POST /functions/v1/facebook-page-embedded-signup?action=finish
  ↓ payload: { state, code, selected_page_ids: [...] }
  ↓ backend: troca code, busca page tokens, subscribe webhook, salva em integrations
  ↓ response: { success: true, integrations: [...] }
postMessage para opener window → fecha popup
useFacebookPageIntegration refetch
  ↓ UI mostra "Conectado: 2 página(s)"
```

### Mudança em `IntegrationsPage.tsx`

Adicionar no array de providers (linha ~36):

```ts
{
  id: "facebook_page",
  name: "Facebook Messenger",
  description: "Receba mensagens de páginas do Facebook no Inbox",
  icon: FacebookIcon, // lucide-react
  configRoute: "/facebook-page",
  category: "messaging",
},
```

### `useFacebookPageIntegration.ts` (skeleton)

```ts
export function useFacebookPageIntegration() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integrations", "facebook_page", user?.client_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("provider", "facebook_page")
        .eq("client_id", user?.client_id)
        .eq("status", "connected");
      return data ?? [];
    },
    enabled: !!user?.client_id,
  });

  const connect = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke(
      "facebook-page-embedded-signup?action=initiate",
      { body: { tenant: tenant?.subdomain ?? "" } },
    );
    if (error) throw error;
    window.open(data.popup_url, "fb-page-connect", "width=600,height=700,popup");
    // Listen for postMessage from popup
    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        if (e.origin !== `https://${window.location.host.replace(/^[^.]+\./, "")}`) return;
        if (e.data?.type === "fb-page-connected") {
          window.removeEventListener("message", handler);
          queryClient.invalidateQueries({ queryKey: ["integrations", "facebook_page"] });
          resolve(e.data.integrations);
        }
        if (e.data?.type === "fb-page-error") {
          window.removeEventListener("message", handler);
          reject(new Error(e.data.error));
        }
      };
      window.addEventListener("message", handler);
    });
  }, [tenant?.subdomain, queryClient]);

  const disconnect = useCallback(async (integrationId: string) => {
    await supabase
      .from("integrations")
      .update({ status: "disconnected" })
      .eq("id", integrationId);
    queryClient.invalidateQueries({ queryKey: ["integrations", "facebook_page"] });
  }, [queryClient]);

  return { integrations: integrations ?? [], isLoading, connect, disconnect };
}
```

### Popup page no root domain (`public/oauth/facebook-page/connect/index.html`)

Mesma estrutura da página de WhatsApp:
1. Lê `state` da URL
2. Carrega FB SDK (`https://connect.facebook.net/en_US/sdk.js`)
3. Busca config: `POST /functions/v1/facebook-page-embedded-signup?action=config`
4. Chama `FB.login({ scope, config_id })`
5. Obtém `code` do response
6. `POST /functions/v1/facebook-page-embedded-signup?action=list` → mostra lista de páginas
7. User seleciona
8. `POST /functions/v1/facebook-page-embedded-signup?action=finish` com `selected_page_ids`
9. `window.opener.postMessage({ type: "fb-page-connected", integrations }, "*")`
10. `window.close()`

---

## Testes recomendados antes do deploy

### Webhook v2 (após deploy)

```bash
# Teste 1: GET handshake com verify_token correto
curl "https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/facebook-messenger-webhook?hub.mode=subscribe&hub.verify_token=TOKEN_REAL&hub.challenge=12345"
# Esperado: 12345

# Teste 2: GET handshake com token errado
curl "https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/facebook-messenger-webhook?hub.mode=subscribe&hub.verify_token=ERRADO&hub.challenge=12345"
# Esperado: 403 Forbidden

# Teste 3: POST sem signature header
curl -X POST "https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/facebook-messenger-webhook" \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[]}'
# Esperado: 403 Forbidden (v1 aceitava — v2 rejeita)

# Teste 4: POST com signature válida
# Calcular HMAC-SHA256 do body com FACEBOOK_APP_SECRET, prefixar com "sha256="
# Header: X-Hub-Signature-256: sha256=<hex>
# Esperado: 200 {"status":"ok"}
```

### Embedded Signup

```bash
# Teste 1: config endpoint (público)
curl -X POST "https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/facebook-page-embedded-signup?action=config"
# Esperado: { app_id, config_id, graph_version }

# Teste 2: initiate sem auth
curl -X POST "https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/facebook-page-embedded-signup?action=initiate"
# Esperado: 401 Unauthorized

# Teste 3: initiate com auth válida do tenant
# Precisa do JWT do user logado — testar via UI quando estiver pronta
```

---

## Decisões deferidas para próxima sessão

1. **UI da seleção de páginas** — sempre mostrar a lista pro user escolher, ou conectar todas automaticamente? Recomendação: sempre mostrar lista (UX padrão Meta).
2. **Cache da `access_token` (long-lived user token)** — meta-oauth usa `meta_oauth_sessions` para isso. Vale criar `facebook_page_oauth_sessions` ou reaproveitar a mesma tabela? Recomendação: reaproveitar `meta_oauth_sessions` adicionando um `type: "facebook_page"`.
3. **Migração da integração existente "Totum USA"** — manual (SQL UPDATE com webhook_verify_token e refresh do page_access_token) vs reconectar via novo fluxo. Recomendação: reconectar via UI nova quando estiver pronta.
4. **Envio de mensagens** (out of scope desta entrega) — implementar `facebook-page-send` edge function para o user responder via Inbox.
