

## Garantir coexistência das conexões WhatsApp Lite e Oficial

### Análise do estado atual

Ambas as conexões já estão arquiteturalmente separadas:
- **Lite** (`provider: "whatsapp"`): usa Evolution API com Baileys, QR code, funciona 100%
- **Oficial** (`provider: "whatsapp_official"`): usa Evolution API com Cloud API, tem problemas na criação da instância e no fluxo de conexão

### Problemas identificados

1. **Payload de criação da instância oficial usa campos errados**: O código envia `phoneNumberId`, `businessId`, `accessToken` — mas a Evolution API v2 espera `number`, `businessId` e `token` para instâncias `WHATSAPP-BUSINESS`

2. **Conexão oficial tenta QR code**: O fluxo `connect` chama `/instance/connect/` que retorna QR para Baileys. Para Cloud API, a instância se conecta automaticamente após criação com as credenciais corretas — não precisa de `/instance/connect/`

3. **Status oficial depende de `state === "open"`**: Para Cloud API, o estado pode ser diferente. Se as credenciais forem válidas, a instância é considerada conectada

4. **Webhook busca apenas `status = "connected"`**: Se a instância oficial ficar como `configured`, mensagens recebidas são ignoradas

5. **`send-message` não diferencia a rota da Evolution**: A Evolution API usa a mesma rota `sendText` para ambos os tipos, mas o número precisa ser formatado diferentemente para oficial (sem `@s.whatsapp.net`)

### Plano de correção

**Step 1: Corrigir payload de criação no `whatsapp-proxy` (action `connect`)**
- Quando `type === "official"`, enviar o payload correto da Evolution API v2:
  ```json
  {
    "instanceName": "...",
    "integration": "WHATSAPP-BUSINESS",
    "token": "<access_token>",
    "number": "<phone_number_id>",
    "businessId": "<business_id>",
    "qrcode": false
  }
  ```
- Após criação bem-sucedida da instância oficial, marcar status como `connected` diretamente (Cloud API não usa QR)
- Não chamar `/instance/connect/` para oficial — a instância se conecta automaticamente

**Step 2: Ajustar action `status` para oficial**
- Para `type === "official"`: se a Evolution retornar erro 404 ou estado desconhecido, mas as credenciais existem, manter status como `configured` em vez de `disconnected`

**Step 3: Flexibilizar busca no webhook**
- Em `handleOfficialWebhook`: buscar integrações com `provider = "whatsapp_official"` sem filtrar por `status = "connected"` — aceitar também `configured` e `connecting`

**Step 4: Ajustar `useWhatsAppIntegration` para oficial**
- No `connect()`: para tipo `official`, não esperar `data.base64` (QR code) — verificar `data.instance` ou `data.hash` como sinal de sucesso
- Chamar `checkStatus()` automaticamente após connect oficial

### Arquivos modificados
1. `supabase/functions/whatsapp-proxy/index.ts` — payload criação, fluxo connect, status
2. `supabase/functions/whatsapp-webhook/index.ts` — busca flexível por status
3. `src/hooks/useWhatsAppIntegration.ts` — fluxo connect oficial sem QR

### Sem alteração
- `WhatsAppPage.tsx` (formulário permanece igual)
- `InboxPage.tsx` / `ReplyBox.tsx` (seletor de canal já implementado)
- Fluxo Lite permanece 100% intacto

