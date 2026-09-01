# OpenWA (Totum SDR) — o que falta para a integração ficar completa

## Funciona hoje (depois desta migration de código)
- Criar sessão, conectar (QR), checar status, desconectar/apagar, enviar mensagem de texto.
- Ativado via `UPIXEL_WA_TYPE=openwa` (ver `tmp/WHATSAPP_OPENWA_CONFIG.md`).

## NÃO funciona ainda — bloqueio real

**Mensagens recebidas do cliente não chegam ao CRM.**

`supabase/functions/whatsapp-webhook/index.ts` só entende o payload da Evolution API
(`body.event === "messages.upsert"`, `body.instance`, `body.data`). O servidor
OpenWA (Totum SDR) manda eventos com nomes diferentes — confirmado via
`GET /api/webhooks`: `message.received`, `session.status`, `session.disconnected` —
e provavelmente um corpo JSON diferente. Esse arquivo estava fora do escopo autorizado
desta tarefa (área crítica, "não tocar").

**Para fechar isso:**
1. Registrar um webhook na sessão OpenWA apontando para a `whatsapp-webhook` do
   Supabase (`POST /api/webhooks` — formato de request não confirmado, só o de
   resposta via `GET /api/webhooks`).
2. Adaptar `whatsapp-webhook/index.ts` para reconhecer o formato OpenWA
   (`message.received` etc.) e mapear pros mesmos campos que a Evolution já popula
   (telefone, texto, mídia, `whatsapp_message_id` pra suprimir eco).
3. **Atenção:** a sessão `cludia-atendimento` (produção, já conectada) tem hoje um
   webhook ativo apontando para `http://10.0.17.1:3100/api/webhook/openwa` — um
   serviço interno que não é o CRM. Não sobrescrever/duplicar sem confirmar o que
   é esse serviço.

## Endpoints usados no código — status de confirmação

| Endpoint | Confirmado como? |
|---|---|
| `GET /api/sessions` | ✅ testado ao vivo |
| `GET /api/sessions/{id}` | ✅ testado ao vivo |
| `GET /api/sessions/{id}/qr` | ✅ endpoint existe (testado numa sessão já conectada, retornou 400 esperado) |
| `GET /api/webhooks` | ✅ testado ao vivo |
| `POST /api/sessions` (criar) | ⚠️ informado, não testado (evitei POST em servidor de produção) |
| `POST /api/sessions/{id}/start` | ⚠️ informado, não testado |
| `POST /api/sessions/{id}/messages/send-text` | ⚠️ informado, não testado — formato do body (`{to, text}`) é um palpite razoável, não confirmado |
| `DELETE /api/sessions/{id}` | ⚠️ inferido por convenção REST, não testado |
| Envio de mídia | ❌ desconhecido — `send-media` retorna erro explícito "não suportado" para OpenWA em vez de adivinhar |
| `POST /api/webhooks` (registrar webhook) | ❌ desconhecido — não implementado |

## Recomendação

Testar T4 (conectar um número novo de verdade) num tenant de teste antes de contar
como resolvido para o time comercial. Se `POST /api/sessions` ou `/start` tiverem
formato diferente do usado aqui, o erro vai aparecer claro na tela (mensagem +
detalhe HTTP), não silencioso.
