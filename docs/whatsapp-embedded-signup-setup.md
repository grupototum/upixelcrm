# Setup do Embedded Signup — WhatsApp + Instagram

**Esse documento cobre os 2 fluxos.** Você precisa fazer os passos uma vez pra
WhatsApp + uma vez pra Instagram. Eles compartilham o mesmo `META_APP_ID`,
`META_APP_SECRET` e usam **Configuration IDs diferentes**.

---

# Parte 1 — WhatsApp Cloud API

Este guia configura o "Continuar com Facebook" no uPixel — botão único que abre popup
Meta, deixa o usuário escolher número, e conecta automaticamente (sem copiar tokens).

**Estimativa:** 10 minutos depois que o App Review for aprovado.

---

## Pré-requisito: App Review aprovado

A Meta exige que o app uPixel tenha estas permissões aprovadas via App Review **antes**
do Embedded Signup funcionar:

- `whatsapp_business_management`
- `whatsapp_business_messaging`

**Como verificar:**
1. Abre [App Review → Permissions](https://developers.facebook.com/apps/911162198384188/app-review/permissions/)
2. Procura as 2 permissões acima. Status deve ser **"Approved"** (verde).

**Se NÃO estão aprovadas:**
- Clica em **"Add to submission"** em cada uma
- Preenche o caso de uso ("uPixel é uma plataforma de CRM SaaS multi-tenant que oferece WhatsApp Business aos seus clientes via Embedded Signup")
- Submete pra review (1-3 semanas)
- Enquanto isso, usuários finais caem no fluxo manual atual (também funciona)

---

## Passo 1 — Pegar o App Secret

1. Abre [Settings → Basic](https://developers.facebook.com/apps/911162198384188/settings/basic/)
2. Em **"Chave Secreta do Aplicativo"** clica em **"Mostrar"**
3. Faz login com sua senha de admin do Facebook se pedir
4. Copia o valor (formato hexa, ~32 chars)
5. **Não compartilha com ninguém** — é o equivalente de uma master password do app

---

## Passo 2 — Criar a Embedded Signup Configuration

1. No app dashboard, vai em **WhatsApp** (no menu lateral)
2. Procura "Embedded Signup" ou "Onboarding" — geralmente está em **WhatsApp → Configurações** ou **WhatsApp → Onboarding**
3. Clica em **"Create configuration"** (ou "Nova configuração")
4. Preenche:
   - **Nome**: `uPixel WhatsApp Cloud Connection` (ou similar)
   - **Webhook Callback URL**: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/whatsapp-cloud-webhook`
   - **Verify token**: pega um valor aleatório forte (gera com `openssl rand -hex 32` ou usa o que aparecer) — guarda esse valor, vai ser checado pelo webhook
   - **Permissions**: marca `whatsapp_business_management` + `whatsapp_business_messaging`
5. Salva e copia o **Configuration ID** que aparece (formato numérico, ex: `1234567890123456`)

> ⚠️ Se o Meta Dashboard mostra o submenu "Embedded Signup" como bloqueado, é porque a app review ainda não saiu. Faz o passo do pré-requisito primeiro.

---

## Passo 3 — Adicionar secrets no Supabase

1. Abre [Supabase Dashboard → Edge Functions → Secrets](https://supabase.com/dashboard/project/xusdhzwfkzufupjwbebt/functions/secrets)
2. Adiciona/atualiza:

| Nome | Valor |
|---|---|
| `META_APP_ID` | `911162198384188` |
| `META_APP_SECRET` | (do Passo 1) |
| `META_WHATSAPP_CONFIG_ID` | (do Passo 2) |

3. Clica **Save**

> O `META_APP_SECRET` **nunca** vai pro frontend. Fica só nas Edge Functions.

---

## Passo 4 — Adicionar env vars públicas no Vercel

O frontend precisa do App ID e do Configuration ID pra abrir o popup. Esses dois são
**públicos** (qualquer botão do FB de qualquer site da Meta expõe o App ID).

1. Abre Vercel Dashboard → projeto uPixel → **Settings → Environment Variables**
2. Adiciona:

| Nome | Valor | Environment |
|---|---|---|
| `VITE_META_APP_ID` | `911162198384188` | Production, Preview, Development |
| `VITE_META_WHATSAPP_CONFIG_ID` | (do Passo 2) | Production, Preview, Development |

3. **Redeploy** o frontend pra essas vars serem injetadas no build.

---

## Passo 5 — Testar end-to-end

1. Abre [master.upixel.app/whatsapp](https://master.upixel.app/whatsapp)
2. Clica em **"WhatsApp Oficial (Meta)"** (botão verde no header)
3. Deve aparecer um card com **"Continuar com Facebook"**
4. Clica → popup do Facebook abre
5. Loga com a conta dona da WABA
6. Seleciona o número que quer conectar
7. Popup fecha sozinho
8. uPixel mostra: "WhatsApp conectado! Webhook registrado automaticamente"

### Se algo der errado

| Sintoma | Provável causa |
|---|---|
| Botão "Continuar com Facebook" não aparece | `VITE_META_APP_ID` ou `VITE_META_WHATSAPP_CONFIG_ID` não foram injetados no build. Redeploy. |
| Popup abre mas mostra "Funcionalidade indisponível" | App Review pra `whatsapp_business_management` não foi aprovada ainda |
| Popup fecha sem dar resultado | Provavelmente erro de origem do `postMessage`. Ver console do browser. |
| "Falha ao trocar código por token" | `META_APP_SECRET` no Supabase está errado ou não foi salvo |
| Conectou mas webhook não funciona | Verifica se a Callback URL no Passo 2 está correta. Mesmo que dê erro nesse passo, dá pra registrar webhook manualmente depois. |

---

## Como funciona por dentro

```
┌─────────────────┐                                 ┌───────────────────┐
│ Usuário no      │  1. Click "Continuar com FB"    │ Frontend uPixel   │
│ uPixel          ├────────────────────────────────►│ CloudEmbeddedSign │
└─────────────────┘                                 │ up.tsx            │
                                                    └──────┬────────────┘
                                                           │
                                       2. FB.login(...)    │
                                       config_id, scope    │
                                       v22.0               ▼
                                                    ┌───────────────────┐
                                                    │ Facebook Popup    │
                                                    │ - Login           │
                                                    │ - Escolhe WABA    │
                                                    │ - Escolhe número  │
                                                    └──────┬────────────┘
                                                           │
                            3. postMessage()               │
                               WA_EMBEDDED_SIGNUP          │
                               { phone_number_id, waba_id }│
                                                           ▼
                                                    ┌───────────────────┐
                                                    │ Frontend captura  │
                                                    │ phone+waba IDs    │
                                                    └──────┬────────────┘
                                                           │
                                                           │ 4. POST /functions/v1/
                                                           │    whatsapp-cloud-exchange-token
                                                           │    { code, phone_number_id, waba_id }
                                                           ▼
                                                    ┌───────────────────┐
                                                    │ Edge Function     │
                                                    │ - troca code →    │
                                                    │   access_token    │
                                                    │ - GET phone info  │
                                                    │ - POST /WABA/     │
                                                    │   subscribed_apps │
                                                    │ - INSERT integ.   │
                                                    └──────┬────────────┘
                                                           │
                                                           ▼
                                                    ┌───────────────────┐
                                                    │ uPixel mostra     │
                                                    │ "Conectado!"      │
                                                    └───────────────────┘
```

A partir daqui mensagens recebidas no número conectado caem no Inbox automaticamente
via `whatsapp-cloud-webhook` (já implementado em round anterior).

---

# Parte 2 — Instagram

O fluxo é parecido com o do WhatsApp mas usa **Facebook Login for Business** com
um `config_id` próprio do Instagram.

## Pré-requisito: App Review aprovado pra Instagram

A Meta exige estas permissões aprovadas:

- `instagram_basic` (geralmente auto-aprovado)
- `instagram_manage_messages`
- `pages_show_list`
- `pages_manage_metadata`
- `business_management`

**Como verificar:** mesma página do WhatsApp ([App Review → Permissions](https://developers.facebook.com/apps/911162198384188/app-review/permissions/)).

> Pela screenshot da review do app, `Gerenciar mensagens e conteúdo no Instagram` já
> aparece como caso de uso adicionado — bom sinal. Confirma se as permissões acima
> estão em "Approved" (verde).

## Pré-requisito do usuário final

**Toda conta Instagram que for conectar precisa estar:**
1. Em modo **Business** (não pessoal) — converte em Configurações → Conta → Mudar para Profissional
2. **Vinculada a uma Página Facebook** — em business.facebook.com → Adicionar ativos → Instagram

Se não estiver, o popup do FB não mostra a conta no seletor de Pages.

## Passo 1 — Criar a Instagram Configuration

1. No app dashboard, vai em **Facebook Login for Business** (no menu lateral)
   → **Configurations**
2. Clica em **"Create configuration"**
3. Preenche:
   - **Nome**: `uPixel Instagram Connection`
   - **Tipo de configuração**: General (recomendado)
   - **Permissions**: marca todas as 5 listadas acima no pré-requisito
4. Salva e copia o **Configuration ID** (formato numérico)

## Passo 2 — Configurar Webhook do Instagram

1. No app dashboard, vai em **Instagram** (no menu lateral)
   → **Webhooks** ou **Configuração**
2. Callback URL: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/instagram-webhook`
3. Verify Token: usa o mesmo que está em `integrations.config.webhook_verify_token`
   (ou gera um novo e atualiza no banco)
4. **Subscribe** aos campos: `messages`, `messaging_postbacks`, `messaging_seen`,
   `comments`, `mentions`, `story_insights`

> 💡 Esta configuração é **a nível de app**. A subscription por conta individual
> (`POST /{ig_user_id}/subscribed_apps`) é feita automaticamente pelo
> `instagram-exchange-token` quando o usuário conecta via Embedded Signup.

## Passo 3 — Adicionar env var no Vercel

| Nome | Valor | Environment |
|---|---|---|
| `VITE_META_INSTAGRAM_CONFIG_ID` | (do Passo 1) | Production, Preview, Development |

(`META_APP_ID`, `META_APP_SECRET` e `VITE_META_APP_ID` já estão configurados pelo
fluxo do WhatsApp — não precisa duplicar.)

Redeploy do frontend depois de adicionar.

## Passo 4 — Testar end-to-end

1. Abre [master.upixel.app/instagram](https://master.upixel.app/instagram)
2. Card "**Conexão em 1 clique**" aparece no topo
3. Clica em **"Conectar Instagram via Facebook"**
4. Popup FB abre → loga → escolhe Página (e Instagram vinculado)
5. Popup fecha → uPixel mostra "Instagram conectado! @username"

Se você gerencia múltiplas Páginas com Instagram, aparece uma tela intermediária
pra escolher qual conectar.

## Resolução de problemas

| Sintoma | Causa |
|---|---|
| "Nenhuma Página Facebook conectada a uma conta Instagram Business" | A conta IG do usuário não é Business OU não está vinculada a uma Página FB |
| Botão "Conectar Instagram via Facebook" não aparece | Falta `VITE_META_INSTAGRAM_CONFIG_ID` no Vercel — redeploy depois de adicionar |
| Popup abre mas mostra "Funcionalidade indisponível" | App Review pra `instagram_manage_messages` não aprovada |
| Conecta mas webhook não funciona | Configuration do webhook (Passo 2) não foi feita — siga ela uma vez |

