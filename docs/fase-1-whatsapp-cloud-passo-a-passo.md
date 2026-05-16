# Fase 1 — Conectar WhatsApp Cloud (passo a passo operacional)

Companheiro do [`integracoes-checklist.md`](./integracoes-checklist.md). Aqui o detalhe
dos cliques. Toda Fase 1 é **trabalho manual** no painel Meta + UI do uPixel — o
código já está pronto (auditado).

**Pré-requisitos:**
- App Meta criado, ID `911162198384188`
- Tenant ativo (ex.: `master.upixel.app`)
- Conta Facebook admin do Business Manager `882191119505136`

**Tempo estimado:** ~2h (sendo ~30min de espera pela Meta verificar o webhook).

---

## Estado do código (auditado nesta branch)

| Componente | Status | Caminho |
|---|---|---|
| Modal "API Oficial" (Phone Number ID + WABA ID + Token) | ✅ pronto | `src/components/whatsapp/CloudConnectModal.tsx` |
| Botão "WhatsApp Oficial (Meta)" | ✅ pronto | `src/pages/WhatsAppPage.tsx:558` |
| Edge function `whatsapp-cloud-proxy` (verify + save) | ✅ pronto | `supabase/functions/whatsapp-cloud-proxy/index.ts` |
| Geração automática de `webhook_verify_token` | ✅ pronto | `whatsapp-cloud-proxy/index.ts:122` |
| Edge function `whatsapp-cloud-webhook` (GET verify + POST messages) | ✅ funcional | `supabase/functions/whatsapp-cloud-webhook/index.ts` |
| Download de mídia (CDN Meta → Supabase Storage) | ✅ pronto | mesmo arquivo, `downloadAndStoreMedia()` |
| Validação `X-Hub-Signature-256` no POST | ⚠️ **ausente** | gap conhecido, não bloqueia Fase 1 mas atender antes de produção |
| Tratamento de `message_template_status_update` / `account_*` | ⚠️ ignorado | webhook só trata `messages`; bloqueia visualização de aprovação de template em tempo real |

Gaps acima **não impedem** o handshake nem o teste de envio/recebimento da Fase 1.
São próximos passos de hardening (Fase pós-aprovação ou paralelo).

---

## 1.1 — Coletar credenciais na Meta

1. Abre https://developers.facebook.com/apps/911162198384188/whatsapp-business/wa-dev-console
2. No seletor de **WhatsApp Business Account** confirma `26391510550470607`
3. No seletor de **From** escolhe o número (teste da Meta funciona pros vídeos; pra produção, número real Totum)
4. Copia (cole num bloco de notas temporário):
   - **Phone number ID** (campo "ID do número de telefone")
   - **WhatsApp Business Account ID** = `26391510550470607`
   - **Temporary access token** (botão "Gerar token"). Vale **24h**.

> 🔐 Pra produção quem fica é o **System User Token permanente** (gerado em
> Business Settings → Users → System Users → cria user → assign WABA → gera token
> com `whatsapp_business_messaging` + `whatsapp_business_management`). Mas pro
> handshake e gravação dos vídeos da App Review, o token de 24h serve.

---

## 1.2 — Conectar no uPixel

1. Login em https://master.upixel.app (ou `totum.upixel.app`)
2. Sidebar → **WhatsApp**
3. Header da página → botão **"WhatsApp Oficial (Meta)"** (verde, à direita)
4. Modal abre no passo "choose" → clica **"Conectar API Oficial"** (ou nome equivalente)
5. No passo "form", cola:
   - **Phone Number ID** → campo correspondente
   - **WhatsApp Business Account ID** → campo correspondente
   - **Permanent Access Token** → o temporary token de 24h (sim, o campo aceita)
   - **Display Name** (opcional) → ex.: "Totum WhatsApp"
6. Clica **"Verificar e salvar"**
7. Estado passa por `verifying` → `verified` → `saved`. Se der erro de credencial,
   a Meta API retornou 4xx — confira se token não expirou e se WABA ID está certo.
8. No passo final **"saved"**, aparecem dois campos com botão Copy:
   - **URL do Webhook** → `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/whatsapp-cloud-webhook?integration_id=<UUID>`
   - **Verify Token** → UUID gerado automaticamente
   - **COPIA OS DOIS AGORA** — vão pro passo 1.3
9. Fecha modal → card aparece na lista com badge **"Conectado"**

> ⚠️ Se errar e fechar antes de copiar: vai em **WhatsApp → card da integração → engrenagem**
> e os dois valores ficam visíveis lá. (Se não estiverem visíveis, é um gap — abra issue.)

---

## 1.3 — Configurar webhook na Meta

1. Volta pra https://developers.facebook.com/apps/911162198384188/whatsapp-business/wa-settings
2. Em **Configuração → Webhook**, clica **Editar**
3. Cola:
   - **URL de callback**: a URL do passo 1.2 (com `?integration_id=...` no final)
   - **Verificar token**: o UUID do passo 1.2
4. Clica **"Verificar e salvar"**
   - A Meta faz GET na URL, o `whatsapp-cloud-webhook` valida o token contra
     `integrations.config.webhook_verify_token` e responde o `hub.challenge`
   - Se falhar: ver `supabase functions logs whatsapp-cloud-webhook` — geralmente é
     `integration_id` errado na URL ou token diferente
5. Após verificado, em **Campos de webhook** → **Gerenciar** → assina:
   - `messages` ✅ (obrigatório)
   - `message_template_status_update` ✅
   - `account_update` ✅
   - `account_alerts` ✅
   - `account_review_update` ✅
6. Salva

---

## 1.4 — Forma de pagamento da WABA

Templates marketing e número de produção exigem cartão.

1. Abre https://business.facebook.com/wa/manage/phone-numbers/?business_id=882191119505136
2. Topo da página → alerta amarelo "Adicione uma forma de pagamento"
3. Clica → **Adicionar cartão**
4. Cartão **CNPJ Totum**, moeda **BRL**
5. Confirma. Sem isso, templates de marketing não saem da fila.

> Pra teste/vídeo da App Review, **não é estritamente obrigatório** — número de teste e
> templates utility funcionam sem cartão. Mas pra cliente real, configure já.

---

## 1.5 — Testar handshake

1. Do seu WhatsApp pessoal, envia uma mensagem qualquer pro número conectado
2. No uPixel → **Inbox** → confere que a conversa apareceu (≤ 5s)
3. Abre a conversa → digita resposta → clica enviar
4. No celular pessoal, recebe a resposta (≤ 5s)
5. Volta no Inbox → status da mensagem enviada aparece como **"Enviada"** (e depois
   "Entregue" se o destinatário tem WA aberto)

### Se algo falhar

| Sintoma | Causa provável | Onde olhar |
|---|---|---|
| Mensagem não aparece no Inbox | Webhook POST não chegou ou foi rejeitado | `supabase functions logs whatsapp-cloud-webhook --tail` |
| GET handshake falha na Meta | `webhook_verify_token` errado ou `integration_id` ausente na URL | logs da edge function |
| Envio retorna erro | Token expirou (lembra que era 24h) | regera no painel Meta + atualiza integration |
| Conversa aparece mas mídia não | Falha no `downloadAndStoreMedia` | logs + checar bucket `whatsapp_media` |
| Tudo OK mas template não envia | Falta cartão (Passo 1.4) ou template não aprovado | Meta WA Manager → Templates |

---

## Pendências Fase 0.3 (pré-requisito desta branch)

Antes da Fase 1 ir pra App Review, a Meta também exige `deauthorize-callback`.

Esta branch agora inclui o código portado de `claude/configure-callback-url-aeXGv`:

- `supabase/functions/deauthorize-callback/index.ts`
- `supabase/migrations/20260515_meta_deauthorization_events.sql`

**Falta deploy (humano aprova — No-Fly Zone do CLAUDE.md):**

```bash
# 1. Aplica migration
supabase db push   # ou colar o SQL no SQL Editor

# 2. Deploy da função
supabase functions deploy deauthorize-callback --no-verify-jwt

# 3. Confere
curl https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/deauthorize-callback
# → {"ok":true,"message":"Meta Deauthorize Callback endpoint — POST aqui..."}
```

**Configura no painel Meta:**
- Settings → Basic → "Deauthorize Callback URL":
  `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/deauthorize-callback`

Secret necessário (já deve estar setado, confirmar):
- `META_APP_SECRET` em Supabase Edge Functions Secrets

---

## Critério "Fase 1 concluída"

- [ ] Card "Conectado" no `/whatsapp` com phone number visível
- [ ] Mensagem inbound aparece no Inbox em ≤ 5s
- [ ] Mensagem outbound é entregue no celular em ≤ 5s
- [ ] Webhook na Meta com status verde "Verified" em todos os 5 campos
- [ ] Fase 0.3 deauthorize-callback respondendo 200 em GET
- [ ] (Opcional) Cartão BRL na WABA

Quando todos ✅ → seguir pra **Fase 2 (Instagram)** ou pular pra **Fase 6 (gravar vídeos)**
se o objetivo for fechar submissão WhatsApp primeiro.
