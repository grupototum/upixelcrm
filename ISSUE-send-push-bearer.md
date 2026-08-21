# ISSUE — `send-push` provavelmente nunca envia notificação

**Severidade:** 🔴 alta (funcionalidade quebrada em produção, silenciosamente)
**Origem:** achado A-01 de `AUDITORIA-API-KEYS.md`, aberto separado por P1.1 do batch de 2026-08-21.

## Arquivos afetados

- `supabase/functions/whatsapp-webhook/index.ts:24` — chama `send-push` com
  `Authorization: Bearer <SERVICE_ROLE_KEY>`.
- `supabase/functions/instagram-webhook/index.ts:17` — mesma chamada, mesmo padrão.
- `supabase/functions/send-push/index.ts:88` — autentica a chamada recebida com
  `userClient.auth.getUser()`.

## Comportamento atual vs esperado

**Esperado:** ao chegar uma mensagem nova (WhatsApp ou Instagram), o webhook dispara
`send-push` internamente (server-to-server) para notificar o usuário via push.

**Atual:** `send-push` valida a chamada com `auth.getUser()`, que espera um JWT de **usuário**
(com `sub` de um `auth.users.id`). Um JWT de `service_role` **não** representa um usuário —
`getUser()` rejeita, retornando erro/`null`. A chamada de `whatsapp-webhook`/`instagram-webhook`
para `send-push` é fire-and-forget com `catch` silencioso — a falha nunca aparece em log nem
em qualquer lugar visível.

## Impacto

Push notifications de novas mensagens **provavelmente nunca chegaram** desde que esse código
existe. Silencioso — nenhum erro visível, nenhum toast, nenhuma linha em `error_logs` (o catch
não chama `logger.error`). Sem instrumentação hoje (a feature de Log de Erros, quando existir,
tornaria isso visível — mas não previne o bug).

## Como confirmar

Invocar `send-push` manualmente com um bearer de `service_role` (via `curl` ou MCP
`deploy_edge_function`/teste) e observar se retorna 401/erro de auth. Alternativa mais barata:
adicionar um `console.error`/`logger.error` temporário no catch de `whatsapp-webhook:24` e
observar os logs da function na próxima mensagem recebida.

## Fix proposto (só descrição, sem código)

Duas opções, a decidir:

1. **`send-push` passa a aceitar chamadas server-to-server** — checar se o bearer recebido é o
   próprio `service_role` (comparação direta, como já feito em `automation-engine:138`) além de
   (ou em vez de) `auth.getUser()`, quando a chamada vier de outra edge function.
2. **Os webhooks passam a chamar `send-push` de outro jeito** — ex.: usando `admin.auth.getUser()`
   no lado de quem invoca para descobrir o `user_id` alvo e repassando um contexto que
   `send-push` já aceita hoje (que já valida `target_client_id` cross-tenant corretamente,
   `send-push:125`) — ou seja, o problema é só a camada de autenticação da chamada, não a
   lógica de negócio interna, que já parece correta.

Recomendação técnica: opção 1 é o menor diff (muda 1 arquivo, `send-push/index.ts`) e seguiria o
mesmo padrão de guard já usado em `automation-engine`. Não implementado nesta rodada — só
descrição, conforme escopo do P1.1.
