# Configuração do Gateway Asaas

Este documento orienta como configurar a integração entre o Upixel CRM e o Asaas para o sistema de recarga de créditos.

## 1. Obter API Key (Sandbox ou Produção)

1. Acesse sua conta no [Asaas](https://www.asaas.com/) (ou [Sandbox](https://sandbox.asaas.com/)).
2. Vá em **Configurações da Conta** -> **Integrações**.
3. Gere uma nova **API Key**.

## 2. Configurar Variáveis de Ambiente no Supabase

Você precisa adicionar as seguintes chaves nas Edge Functions do Supabase:

```bash
# URL da API do Asaas (Sandbox por padrão)
supabase secrets set ASAAS_API_URL=https://sandbox.asaas.com/api/v3

# Sua API Key gerada no passo anterior
supabase secrets set ASAAS_API_KEY=SUA_CHAVE_AQUI
```

## 3. Configurar Webhook no Asaas

Para que os créditos sejam adicionados automaticamente após o pagamento:

1. No painel do Asaas, vá em **Configurações da Conta** -> **Integrações** -> **Webhooks**.
2. Clique em **Novo Webhook**.
3. **URL do Webhook**: Insira a URL da sua Edge Function `asaas-webhook`.
   - Exemplo: `https://[SEU-ID-PROJETO].supabase.co/functions/v1/asaas-webhook`
4. **Token de Autenticação**: (Opcional, mas recomendado para segurança).
5. **Eventos**: Selecione apenas `Pagamento Recebido` (ou `PAYMENT_RECEIVED`).
6. Salve.

## 4. Testando o Fluxo

1. No Upixel, vá em **Disparos** -> **Recarregar Créditos**.
2. Escolha um pacote de créditos.
3. Escaneie o QR Code Pix gerado.
4. No Sandbox do Asaas, você pode simular o pagamento da cobrança gerada para disparar o webhook.
5. Verifique se o saldo no dashboard do Upixel foi atualizado.

---

> [!IMPORTANT]
> Certifique-se de que a migração SQL `20260401_recharge_system.sql` foi aplicada ao banco de dados Supabase para que as tabelas de créditos e intents existam.
