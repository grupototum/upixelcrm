# Setup do Embedded Signup do WhatsApp Cloud API

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
