# uPixel — SDR Worker (POC)

Worker **externo** (roda na VPS, fora do Supabase) que consome as mensagens da
rota SDR piloto do uPixel, gera uma resposta com um LLM e responde pelo canal
WhatsApp/Evolution já usado pelo CRM.

> **Escopo da POC:** o worker **só conversa**. Ele não cria/edita leads,
> conversas, mensagens, tags ou qualquer outro dado do CRM. A única tabela que
> ele escreve é a própria fila (`whatsapp_message_queue`), atualizando o status
> dos itens que processa.

## Como se encaixa no fluxo

1. O edge `whatsapp-webhook` recebe o inbound do WhatsApp.
2. Para conversas do **piloto SDR** (tenant configurado + lead com a tag
   `sdr-pilot`), ele enfileira o item com `route='sdr'` em vez de disparar os
   motores de automação/bot atuais. Grupos e mensagens `fromMe` já são
   descartados **antes** de enfileirar.
3. O cron `whatsapp-queue-processor` processa apenas `route='salesbot'` — ele
   **ignora** `route='sdr'`. Ou seja, este worker é o único consumidor da rota
   SDR e nada do fluxo existente muda.
4. **Este worker** busca os `route='sdr'` pendentes, gera a resposta e envia.

```
WhatsApp → whatsapp-webhook → whatsapp_message_queue (route='sdr') → [SDR worker] → Evolution → WhatsApp
```

## Fluxo interno por mensagem

`pending` → reivindica (`processing`, atômico) → LLM → envia via Evolution →
`completed`. Em erro: incrementa `attempt_count` e volta a `pending` (retry) ou
vai para `failed` ao estourar `SDR_MAX_ATTEMPTS`.

Ignorados (marcados `completed` com `sdr_skipped`, sem enviar nada): mensagens de
mídia, tipo não-texto e conteúdo vazio. Grupos e `fromMe` não chegam aqui porque
o webhook já os filtra.

### Anti-loop

- O worker **nunca enfileira** o próprio outbound.
- Ao concluir, marca o item com `ai_generated: true` em `message_data` — deixa
  explícito que aquele outbound foi gerado por IA.
- O envio pela Evolution sai como `fromMe=true`, e o `whatsapp-webhook` já
  descarta `fromMe`, então a resposta da IA **não re-entra** na fila.

### Multi-tenant

O `client_id` (tenant) do item é preservado ponta a ponta: a conversa e a
integração WhatsApp usadas para responder são validadas contra o mesmo
`client_id`. Itens com divergência de tenant falham em vez de vazar dados.

## Requisitos

- Node.js **>= 18** (usa `fetch` nativo). Recomendado Node 20+.
- Acesso à `SUPABASE_SERVICE_ROLE_KEY` do projeto uPixel.
- Endpoint de um LLM compatível com a API OpenAI (`/chat/completions`).

## Configuração

```bash
cd sdr-worker
cp .env.example .env   # preencha os valores
npm install
```

Variáveis (ver `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` e ajustes opcionais
(`SDR_POLL_INTERVAL_MS`, `SDR_BATCH_SIZE`, `SDR_MAX_ATTEMPTS`,
`SDR_HISTORY_LIMIT`, `SDR_LLM_TEMPERATURE`, `SDR_SYSTEM_PROMPT`).

> `LLM_BASE_URL` é a base **sem** `/chat/completions` (ex.:
> `https://api.openai.com/v1`, `https://integrate.api.nvidia.com/v1`).

## Rodar

```bash
# Carrega o .env e inicia o loop
npm start           # equivale a: tsx src/index.ts
```

Para carregar o `.env` automaticamente, rode com o flag de env-file:

```bash
node --env-file=.env --import tsx src/index.ts
# ou, em dev, com reload:
npx tsx watch --env-file=.env src/index.ts
```

(Ou exporte as variáveis no ambiente do serviço/systemd/pm2/Docker.)

### Exemplo systemd (VPS)

```ini
# /etc/systemd/system/upixel-sdr-worker.service
[Unit]
Description=uPixel SDR Worker (POC)
After=network.target

[Service]
WorkingDirectory=/opt/upixel/sdr-worker
EnvironmentFile=/opt/upixel/sdr-worker/.env
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Verificação de tipos

```bash
npm run typecheck
```
