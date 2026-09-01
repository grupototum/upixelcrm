# OpenWA (Totum SDR) — o que falta para a integração ficar completa

## Funciona hoje
- Criar sessão, conectar (QR), checar status, desconectar/apagar, enviar mensagem de texto.
- Ativado via `UPIXEL_WA_TYPE=openwa` (ver `tmp/WHATSAPP_OPENWA_CONFIG.md`).
- **Receber mensagens (texto) agora é suportado em paralelo com a Evolution** —
  `whatsapp-webhook/index.ts` reconhece `message.received`/`session.status`/
  `session.disconnected` (OpenWA) ao lado de `messages.upsert`/`connection.update`
  (Evolution), sem alterar o caminho Evolution. `whatsapp-proxy` registra o
  webhook automaticamente (`POST /api/webhooks`) ao criar/conectar uma sessão OpenWA.

## Ainda incerto — não testado contra um evento real

**O formato exato do payload que o OpenWA envia no `message.received` nunca foi
observado.** Só vi o formato de `GET /api/webhooks` (que descreve o webhook
registrado, não o evento em si). O parser em `handleOpenWAMessageWebhook`
tenta vários nomes de campo prováveis (`body.data.message`, `.from`/`.sender`/
`.phone`, `.body`/`.text`/`.content` etc.) e **loga o corpo bruto quando não
reconhece a forma** — depois de conectar um número de teste e mandar uma
mensagem, checar os logs da função `whatsapp-webhook` no Supabase Dashboard.
Se aparecer `"Sem telefone no payload"` ou `"Nenhuma integração para a sessão"`
com o corpo logado, ajustar os nomes de campo em
`supabase/functions/whatsapp-webhook/index.ts` (função `handleOpenWAMessageWebhook`).

**Mídia recebida não é baixada** — chega como aviso de texto genérico
("Mídia recebida — suporte a mídia do OpenWA ainda não implementado"). Endpoint
de download do OpenWA não foi identificado.

**`POST /api/webhooks` (registrar webhook) também não foi testado ao vivo** —
o formato do body é inferido a partir do shape do GET. Se a sessão conectar mas
nenhuma mensagem chegar no CRM, checar primeiro se o webhook foi mesmo criado
(`GET /api/webhooks` deve listar um item com a URL do `whatsapp-webhook` do
projeto) — se não aparecer, o formato do POST precisa de ajuste.

**Atenção:** a sessão `cludia-atendimento` (produção, já conectada) tem hoje um
webhook ativo apontando para `http://10.0.17.1:3100/api/webhook/openwa` — um
serviço interno que não é o CRM. Conectar essa sessão específica pelo uPixelCRM
adicionaria um SEGUNDO webhook (a API permite múltiplos por sessão, confirmado
pelo shape de `GET /api/webhooks` ter `id` próprio por registro) — não deveria
remover o existente, mas confirmar isso antes de testar nela.

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
| `POST /api/webhooks` (registrar webhook) | ⚠️ implementado (chamado automaticamente ao criar/conectar), formato do body inferido, não confirmado |
| Payload do evento `message.received` | ❌ desconhecido — parser defensivo com múltiplos nomes de campo + log do corpo bruto em caso de falha |

## Recomendação

Testar T4 (conectar um número novo de verdade) num tenant de teste antes de contar
como resolvido para o time comercial. Se `POST /api/sessions` ou `/start` tiverem
formato diferente do usado aqui, o erro vai aparecer claro na tela (mensagem +
detalhe HTTP), não silencioso.
