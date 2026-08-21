# ISSUE — `whatsapp-status-probe` sem verificação de auth própria

**Severidade:** 🔴 alta (não é exploração ativa hoje, mas a superfície existe e um deploy
descuidado a abre)
**Origem:** achado A-02 de `AUDITORIA-API-KEYS.md`, aberto separado por P1.2 do batch de 2026-08-21.

## Endpoint exposto sem verificação

`supabase/functions/whatsapp-status-probe/index.ts:41-50` — cria um client Supabase com
`SUPABASE_SERVICE_ROLE_KEY` e lê a tabela `integrations` a partir de um parâmetro de query,
**sem checar `Authorization` dentro do próprio código da função**. O comentário no topo do
arquivo (linha 1-2) descreve a função como um "endpoint público de monitoramento externo" —
mas ela não está declarada em `supabase/config.toml`, então herda o default `verify_jwt = true`
do gateway Supabase. Hoje, na prática, isso significa: **qualquer JWT válido de qualquer usuário
autenticado de qualquer tenant** passa pelo gateway e chega à função, que então usa
service_role para consultar `integrations` de **qualquer** `client_id` pedido no query param —
sem checar se o chamador tem relação com aquele client_id.

## Superfície de ataque

- **O que retorna?** Status de integração (provavelmente `status`, talvez metadados de config)
  de uma tabela que guarda credenciais de WhatsApp/Meta por tenant.
- **É enumerável?** Sim — se o parâmetro de busca é um UUID de `client_id`/integration id, um
  usuário autenticado de um tenant qualquer pode tentar IDs de outros tenants e ler o status
  deles. Não confirmado nesta rodada se a resposta inclui dados sensíveis (tokens) ou só status —
  merece checagem antes de qualquer decisão de severidade final.
- **É DoS-friendly?** Não avaliado — a função não tem rate limit (nenhuma função do repo usa
  `_shared/rateLimit.ts` combinado com esta), então repetidas chamadas de qualquer usuário
  autenticado batem direto no banco via service_role sem limite.

## Por que não é crítico *hoje*

O gateway Supabase (`verify_jwt=true` por default, já que a função não está em `config.toml`)
já exige um JWT válido — não é um endpoint completamente aberto à internet. O risco é
**condicional**: se alguém, tentando "corrigir" o comentário enganoso do arquivo (que já afirma
incorretamente que é público), adicionar `verify_jwt = false` em `config.toml`, a função vira
IDOR aberto sem nenhuma auth, porque o código interno não tem nenhuma verificação própria.

## Fix proposto (só descrição, sem código)

1. **Não adicionar `verify_jwt = false`** — o comentário do arquivo deveria ser corrigido para
   não sugerir isso a quem ler depois.
2. **Adicionar verificação de auth própria dentro da função** (não depender só do gateway):
   validar o JWT do chamador, resolver o `tenant_id`/`client_id` dele, e restringir a consulta de
   `integrations` a esse mesmo tenant (mesmo padrão de resolução usado em `whatsapp-templates`,
   já auditado como padrão canônico).
3. **Rate limit** — usar `_shared/rateLimit.ts` (padrão já existente no repo, usado por
   `whatsapp-webhook`/`meta-leads-webhook`).

Não implementado nesta rodada — só descrição, conforme escopo do P1.2.
