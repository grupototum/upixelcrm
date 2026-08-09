# Etapa 2 — Camada de API e Regras de Negócio

**Projeto:** uPixel CRM
**Data:** 2026-08-09
**Escopo:** 33 Edge Functions Deno + camada de automações no frontend
**Base auditada:** `origin/main` @ `4d376ad` (`docs+infra: Fase 1 adiantada — scaffold Supabase self-hosted`)
**Regra:** somente leitura. Nenhum código foi alterado.

---

## ⚠️ Nota de integridade desta etapa (ler antes de tudo)

O diretório de trabalho local (`/Users/israellemos/Documents/Pixel Systems/upixelcrm`) **perdeu o código-fonte** antes desta auditoria começar:

| Item | Estado encontrado |
|---|---|
| `src/` | 5 arquivos (`App.tsx`, `main.tsx`, `App.css`, `index.css`, `vite-env.d.ts`) — faltam `components/`, `hooks/`, `lib/`, `pages/`, `services/`, `contexts/` |
| `supabase/` | apenas `config.toml` — `functions/` e `migrations/` ausentes |
| `.git/` | `objects/`, `refs/`, `logs/` **destruídos**. `HEAD`, `config`, `index` e `packed-refs` sobreviveram → o repositório não abre (`fatal: not a git repository`) |
| `audit/` | inexistente — o relatório da Etapa 1 (`01-auditoria-geral.md`) e o índice mestre **não estão no disco nem no remoto** |

A cópia em `~/Documents/Bulma/40-49_Trabalho/40.02_Projetos/upixelcrm/upixelcrm` está danificada do mesmo jeito. Não há arquivos `.icloud`, nem packfiles recuperáveis em nenhum lugar de `~/Documents`.

**Consequências desta etapa:**

1. A auditoria foi feita sobre um clone limpo de `origin/main` (`4d376ad`) em diretório temporário — não sobre a branch local `feat/sdr-fase-0`.
2. A branch `feat/sdr-fase-0` **não existe no remoto**. O commit local `feat(sdr): ativação de campanha e encerramento no dispatcher` está perdido junto com o object store.
3. `main` está **à frente** do que a Etapa 1 auditou (93 migrations no remoto vs. 84 citadas). Vários achados da Etapa 1 já foram corrigidos em `main` — sinalizados abaixo como RESOLVIDO / REFUTADO.
4. O item 15 do escopo (ler seções 6 e 7 de `01-auditoria-geral.md`) **não pôde ser cumprido** — o arquivo não existe em lugar nenhum. Os achados da Etapa 1 usados como entrada são apenas os 7 resumidos no briefing.

Ver §9 para as decisões que isso exige.

---

## 1. Resumo Executivo

A camada de API do uPixel CRM são 33 Edge Functions Deno, todas rodando com `SUPABASE_SERVICE_ROLE_KEY` — ou seja, **toda função edge opera acima do RLS**. O isolamento multi-tenant não é garantido pelo banco nessa camada; é garantido (ou não) por código de aplicação, função a função.

O que está bem:

- As funções de usuário final (`admin-create-user`, `meta-ads`, `google-ads`, `rag-*`, proxies) validam JWT + `profiles.role` antes de usar o service role. `admin-create-user` está correto — a hipótese H-011 da Etapa 1 **não se confirma**.
- `automation-engine` ganhou autorização real: distingue chamador interno (service key) de usuário, e deriva ownership das linhas de `automations`/`leads`, nunca do `tenant_id` do body (linhas 126–165).
- 3 dos 5 webhooks públicos já validam assinatura HMAC (`whatsapp-cloud-webhook`, `meta-leads-webhook`, `facebook-messenger-webhook`) ou token pré-compartilhado (`asaas-webhook`). PC-004 está corrigido em `main`.

O que está mal:

- **`whatsapp-webhook` — a função mais crítica do produto — não valida assinatura nenhuma**, em nenhuma das suas duas rotas (Evolution e Meta Official). É `verify_jwt = false` e o único controle é `integration_id` + `instance_name`, ambos enumeráveis. Ver PC-026.
- **Zero rate limiting** nas 33 funções. Nenhuma ocorrência de `rate limit` no código.
- **CORS `*` efetivo em tudo**, incluindo `admin-create-user`, `database-backup` e `tenant-provision-domain`.
- **Regras de negócio triplicadas**: existem três motores de automação com semânticas divergentes (bot engine embutido no webhook, `automation-engine`, `automation_rules`), mais o disparo redundante de fila pelo browser.
- **Duas funções estão com `verify_jwt` errado** por ausência de entrada no `config.toml` — uma delas (`facebook-messenger-webhook`) está, na prática, morta em produção.

Severidade agregada da camada: **alta**. O vetor dominante é injeção de mensagem/lead via webhook não assinado, com escrita cross-tenant através do service role.

---

## 2. Inventário de Edge Functions

`JWT` = gateway valida JWT (`verify_jwt`; ausência de entrada no `config.toml` ⇒ `true`).
`Rate` = rate limiting — **nenhuma função tem**.
`Tenant` = a função valida que o chamador/remetente pertence ao tenant que ela vai escrever.

| # | Função | JWT | CORS | Rate | Tenant validado | Observação |
|---|---|---|---|---|---|---|
| 1 | `whatsapp-webhook` | ❌ não | `*` | ❌ | ⚠️ parcial | **Sem HMAC em nenhuma rota.** Roteia por `integration_id`/`instance_name` |
| 2 | `whatsapp-cloud-webhook` | ❌ não | `*` | ❌ | ✅ | HMAC `X-Hub-Signature-256` + anti-spoofing por `phone_number_id` |
| 3 | `meta-leads-webhook` | ❌ não | `*` | ❌ | ❌ | HMAC OK, mas fallback `|| !cfg?.page_id` quebra o isolamento (PC-027) |
| 4 | `instagram-webhook` | ❌ não | `*` | ❌ | ⚠️ | HMAC presente |
| 5 | `asaas-webhook` | ❌ não | `*` | ❌ | ✅ | Token `asaas-access-token`; recusa tudo se secret ausente |
| 6 | `data-deletion-callback` | ❌ não | `*` | ❌ | n/a | HMAC presente |
| 7 | `facebook-messenger-webhook` | ⚠️ **sim** | ausente | ❌ | ⚠️ | **Falta no `config.toml` → Meta não consegue chamar** (PC-031) |
| 8 | `whatsapp-queue-processor` | ⚠️ **sim** | `*` | ❌ | ❌ | Comentário diz `verify_jwt: false`, config não tem entrada. Guard aceita qualquer JWT (PC-030) |
| 9 | `automation-worker` | sim | `*` | ❌ | ❌ | Guard só rejeita anon key → qualquer usuário de qualquer tenant dispara o drain global (PC-030) |
| 10 | `automation-engine` | sim | `*` | ❌ | ✅ | Autorização por ownership das linhas (linhas 126–165) |
| 11 | `admin-create-user` | sim | `*` | ❌ | ✅ | `role === "master"` via `userClient` (RLS aplicado). **H-011 refutado** |
| 12 | `check-signup-gate` | sim | `*` | ❌ | n/a | Vault + compare por digest. Sem rate limit → brute-force (PC-029) |
| 13 | `ai-chat` | sim | `*` | ❌ | ✅ | Custo externo sem teto |
| 14 | `asaas-payment` | sim | `*` | ❌ | ✅ | |
| 15 | `database-backup` | sim | `*` | ❌ | ✅ | CORS `*` numa função de dump |
| 16 | `facebook-page-embedded-signup` | sim | `*` | ❌ | ✅ | |
| 17 | `google-ads` | sim | `*` | ❌ | ✅ | |
| 18 | `google-oauth` | sim | `*` | ❌ | ✅ | |
| 19 | `instagram-exchange-token` | sim | `*` | ❌ | ✅ | |
| 20 | `instagram-proxy` | sim | `*` | ❌ | ✅ | |
| 21 | `meta-ads` | sim | `*` | ❌ | ✅ | |
| 22 | `meta-ads-exchange-token` | sim | `*` | ❌ | ✅ | |
| 23 | `notify-signup` | sim | `*` | ❌ | n/a | |
| 24 | `rag-embed` | sim | `*` | ❌ | ✅ | |
| 25 | `rag-search` | sim | `*` | ❌ | ✅ | |
| 26 | `send-push` | sim | `*` | ❌ | ✅ | Chamada pelo webhook com service key |
| 27 | `tenant-provision-domain` | sim | `*` | ❌ | ✅ | CORS `*` numa função de provisionamento |
| 28 | `whatsapp-cloud-exchange-token` | sim | `*` | ❌ | ✅ | |
| 29 | `whatsapp-cloud-proxy` | sim | `*` | ❌ | ✅ | |
| 30 | `whatsapp-health-check` | sim | `*` | ❌ | ❌ | |
| 31 | `whatsapp-proxy` | sim | `*` | ❌ | ✅ | |
| 32 | `whatsapp-status-probe` | sim | ausente | ❌ | ❌ | Não importa `corsHeaders` |
| 33 | `whatsapp-templates` | sim | `*` | ❌ | ✅ | |

**CORS:** `supabase/functions/_shared/cors.ts:2` → `Deno.env.get("ALLOWED_ORIGINS") || "*"`. A variável `ALLOWED_ORIGINS` não aparece em nenhum `.env` de referência nem em nenhum outro ponto do repositório. Na prática, **`*` para as 31 funções que importam o shared**.

**Rate limiting:** `grep -rn "rate.limit|rateLimit|ratelimit" supabase/functions/` → **0 ocorrências**.

**Service role:** as **33** funções instanciam client com `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Regras de Negócio — onde vivem e onde estão duplicadas

### 3.1 Mapa

| Regra | Frontend | Edge | Banco |
|---|---|---|---|
| Criar lead a partir de mensagem recebida | — | `whatsapp-webhook:212-299`, `whatsapp-cloud-webhook:107-136`, `meta-leads-webhook:146-216` | — |
| Deduplicação/merge de leads por telefone | — | `whatsapp-webhook:215-246` (merge + **delete**), `whatsapp-cloud-webhook:110-114` (só match), `meta-leads-webhook:153-167` (só match) | — |
| Pipeline padrão quando o tenant não tem colunas | — | `whatsapp-webhook:254-271` (cria 5 colunas) — **só aqui** | — |
| Executar fluxo de automação (nós) | `automation_rules` via `RulesTab.tsx` | `automation-engine` (tabela `automations`), `whatsapp-webhook:425-560` (tabela `bots`) | — |
| Interpolação de variáveis `{{...}}` | — | `automation-engine:20-33`, `whatsapp-webhook:404-409` — **duas implementações diferentes** | — |
| Retomada de automação após resposta do lead | — | `whatsapp-webhook:302-400` (`triggerAutomations` parte 1) + `automation-engine:540-583` (`wait_for_reply`) | — |
| Drenagem da fila de delays | `useAutomationWorker.ts` (polling 60s no browser) | `automation-worker` | `pg_cron` a cada minuto (`20260618_automation_worker_cron_fix.sql`) — **três gatilhos para a mesma coisa** |
| Enfileiramento de delay/timeout | — | `automation-engine:319-349`, `:561-579` | tabela `automation_queue` |
| Roteamento SDR piloto | — | `whatsapp-webhook:687-699` (tenant hardcoded + tag `sdr-pilot`) | — |
| Envio de mensagem por automação | — | `automation-engine:442-539` (texto), `:584-677` (mídia) | — |
| Crédito por pagamento confirmado | — | `asaas-webhook:73-85` | RPC `increment_client_credits` |
| Gate de cadastro | `signup.ts` | `check-signup-gate` | Vault via RPC `read_secret` |
| Criação de usuário por master | `users.ts` | `admin-create-user:33-42` | trigger `handle_new_user` — **corrida documentada** em `admin-create-user:125-141` |

### 3.2 Duplicações concretas

**D-1 — Três motores de automação.**
`bots`/`bot_sessions` (embutido em `whatsapp-webhook`, `MAX_STEPS = 25`, nós `bot_message`/`bot_question`/`bot_condition`/`bot_action`), `automations` (`automation-engine`, nós `trigger`/`condition`/`delay`/`webhook`/`randomizer`/`action`/`message`/`wait_for_reply`/`send_media`/`ai_assistant`, **sem limite de passos**) e `automation_rules` (regras simples, avaliadas no frontend). São três vocabulários de nó, três avaliadores de condição, três formas de enviar WhatsApp.

**D-2 — Duas implementações de interpolação.**
`automation-engine:20-33` navega paths arbitrários (`{{lead.qualquer_coluna}}`) sobre `leadContext = {...lead, ...context}` — a linha inteira de `leads`. `whatsapp-webhook:404-409` faz substituição fixa de `{{lead.name}}`/`{{lead.phone}}` e o resto vem de `vars`. Comportamentos diferentes para a mesma sintaxe que o usuário vê no builder.

**D-3 — Três gatilhos para drenar `automation_queue`.**
`pg_cron` (cada minuto, service key), `useAutomationWorker` (cada 60s, JWT do usuário logado, `useAutomationWorker.ts:5,40`) e chamada manual via `triggerAutomationWorker()`. O cron sozinho basta. O polling do browser continua no código depois do cron ter sido corrigido.

**D-4 — Envio de WhatsApp reimplementado 4×.**
`automation-engine:487` (Evolution texto), `:510` (Official texto), `:623` (Evolution mídia), `:655` (Official mídia), mais `whatsapp-webhook:411-423` (`sendBotMessage`). Nenhum passa por `whatsapp-proxy`.

**D-5 — Handshake de verificação Meta reimplementado 4×** com regras diferentes: `whatsapp-webhook:939-967` (estrito), `whatsapp-cloud-webhook:200-235` (estrito com `integration_id`, permissivo sem), `meta-leads-webhook:49-72` (permissivo, sem CORS), `instagram-webhook`.

---

## 4. Achados Confirmados (PC)

### 4.0 Status dos achados da Etapa 1 em `main`

| Etapa 1 | Status em `4d376ad` | Evidência |
|---|---|---|
| PC-004 — bypass do verify token | ✅ **RESOLVIDO** | `whatsapp-webhook/index.ts:956-963` — comentário `FIX-01`, o fallback `|| integrations.length > 0` foi removido; 403 quando o token não bate |
| PC-011 — "Nova Automação" sem wizard | ❌ **CONFIRMADO** | `ComplexTab.tsx:23-26` → `AppContext.tsx:658-670` |
| PC-012 — reconexão WhatsApp travada | ⚪ **fora do escopo desta etapa** | O filtro `.eq("status","connected")` não existe mais no caminho de automação; `automation-engine:456` e `:602` usam `.in("status", ["connected","configured"])`. Verificar `useWhatsAppIntegration.ts` na etapa de frontend |
| PC-025 — automações rodando no browser | ⚠️ **PARCIAL** | `pg_cron` agendado (`20260618_automation_worker_cron_fix.sql`), mas `useAutomationWorker.ts` continua fazendo polling. Ver D-3 |
| H-003 — webhooks sem validar tenant do remetente | ⚠️ **PARCIAL** | `whatsapp-cloud-webhook` e `meta-leads-webhook` validam HMAC; `whatsapp-webhook` **não valida nada** → ver PC-026 |
| H-011 — `admin-create-user` sem ser master | ✅ **REFUTADO** | `admin-create-user/index.ts:33-42` checa `profile.role !== "master"` → 403 |

### PC-026 — `whatsapp-webhook` aceita payloads Meta Official sem assinatura · **CRÍTICO**

`supabase/functions/whatsapp-webhook/index.ts:981` roteia qualquer POST com `body.object === "whatsapp_business_account"` para `handleOfficialWebhook`, que grava mensagens e cria leads com service role. **Não há chamada a `verifySignature` em lugar nenhum deste arquivo** — ao contrário de `whatsapp-cloud-webhook/index.ts:243` e `meta-leads-webhook/index.ts:80`, que validam `X-Hub-Signature-256` antes de processar.

A função é `verify_jwt = false` (`config.toml:5-6`). O roteamento para tenant é feito por `phone_number_id` lido do próprio corpo da requisição (`:851`, `:857`).

**Impacto:** quem conhecer a URL do webhook e um `phone_number_id` de um tenant injeta mensagens arbitrárias na caixa de entrada daquele tenant, cria leads, e dispara automações (`:903`) — que enviam WhatsApp real para números escolhidos pelo atacante. A rota Evolution (`:702-839`) tem o mesmo problema: o único controle é `integration_id` (UUID na query string) ou `instance_name`, sem segredo.

### PC-027 — `meta-leads-webhook` atribui leads ao tenant errado · **ALTO**

`supabase/functions/meta-leads-webhook/index.ts:114`:

```
if (cfg?.page_id === pageId || !cfg?.page_id) {
```

O `|| !cfg?.page_id` faz com que **qualquer integração `meta_ads` sem `page_id` configurado** capture os leads de **qualquer** página, de qualquer tenant. O loop pega o primeiro match e faz `break` (`:118`), então a atribuição depende da ordem de retorno do banco.

**Impacto:** leads (nome, telefone, e-mail, campanha) de um cliente entram no CRM de outro. Vazamento de PII cross-tenant, direto.

### PC-028 — CORS `*` em toda a superfície de API · **ALTO**

`supabase/functions/_shared/cors.ts:2` — `Deno.env.get("ALLOWED_ORIGINS") || "*"`. `ALLOWED_ORIGINS` não é definida em nenhum arquivo do repositório. Vale para `admin-create-user`, `database-backup`, `tenant-provision-domain`, `asaas-payment`, `ai-chat` e todas as demais.

**Impacto:** qualquer site consegue chamar as funções a partir do browser da vítima. As funções que validam JWT continuam protegidas contra chamada anônima, mas o token vai no header `Authorization` e não em cookie — o risco real aqui é exposição de superfície e leitura de resposta cross-origin em cenários de token vazado, não CSRF clássico.

### PC-029 — Nenhuma função tem rate limiting · **ALTO**

Zero ocorrências no código. Casos concretos:

- `check-signup-gate` — brute-force da senha do gate de cadastro. A única defesa é `await new Promise(r => setTimeout(r, 500))` em `check-signup-gate/index.ts:68`, que não limita concorrência.
- `ai-chat` e o nó `ai_assistant` (`automation-engine:678-762`) — custo direto em OpenAI/NVIDIA sem teto.
- `whatsapp-webhook` — cada mensagem de mídia dispara download + upload em `whatsapp_media` (`:131-169`). Amplificação de storage sem limite.
- `admin-create-user` — enumeração de e-mails via `listUsers()` (`:72-75`).

### PC-030 — `automation-worker` e `whatsapp-queue-processor` aceitam qualquer JWT · **MÉDIO-ALTO**

`automation-worker/index.ts:20-26` e `whatsapp-queue-processor/index.ts:92-98` usam o mesmo guard:

```
if (!workerBearer || workerBearer === (Deno.env.get("SUPABASE_ANON_KEY") ?? "")) → 403
```

Rejeita ausência de credencial e a anon key. **Aceita qualquer JWT de usuário autenticado**, de qualquer tenant. Ambas as funções drenam a fila **global** com service role.

É intencional no caso do `automation-worker` (é o que `useAutomationWorker.ts:31` faz), mas significa que um usuário de qualquer tenant controla o timing de execução das automações de todos os tenants, e pode forçar o processamento repetido da fila inteira.

### PC-031 — `facebook-messenger-webhook` está morto em produção · **MÉDIO**

`supabase/config.toml` lista 6 funções com `verify_jwt = false`: `whatsapp-webhook`, `meta-leads-webhook`, `instagram-webhook`, `asaas-webhook`, `whatsapp-cloud-webhook`, `data-deletion-callback`.

`facebook-messenger-webhook` **não está na lista** → `verify_jwt = true` por padrão. A Meta não envia JWT do Supabase, então **todo POST da Meta é rejeitado no gateway antes de chegar ao código**. A função implementa validação HMAC completa que nunca executa. Também não importa `corsHeaders`.

Mesma classe: `whatsapp-queue-processor/index.ts:3` afirma no comentário `verify_jwt: false — função interna de cron`, mas também não tem entrada no `config.toml`.

### PC-032 — Motor de bot embutido no webhook · **MÉDIO**

`whatsapp-webhook/index.ts:402-560` implementa um segundo motor de automação (`runBotEngine`, `executeBotNodes`, `interpolateVars`, `sendBotMessage`) dentro do handler de webhook, operando sobre `bots`/`bot_sessions`. É independente do `automation-engine`, com vocabulário de nós, avaliador de condições e envio de mensagem próprios. Ver D-1.

**Impacto:** duas fontes de verdade para "o que o bot responde". Correção de bug numa não vale para a outra; o comportamento visto pelo usuário depende de qual tabela a automação foi salva.

### PC-033 — `automation-engine` sem limite de profundidade · **MÉDIO**

Cada nó re-invoca a própria função via `fetch` (`automation-engine/index.ts:801-815`, e também `:213-227` no bypass de nó desabilitado). Não há teto de passos. `steps_executed` é incrementado e gravado (`:793`) mas **nunca comparado com um limite**.

Um ciclo no grafo (edges `A→B→A`, que o builder visual permite desenhar) gera invocações encadeadas indefinidamente. Só `delay` e `wait_for_reply` interrompem a cadeia. Compare com o motor de bot, que tem `MAX_STEPS = 25` (`whatsapp-webhook:434`).

**Impacto:** loop de automação = consumo ilimitado de invocações edge e, se houver nó `message` no ciclo, spam de WhatsApp real para o lead.

### PC-034 — Merge de leads deleta registros sem confirmação nem log · **MÉDIO**

`whatsapp-webhook/index.ts:215-246`. O match é por sufixo de **8 ou 9 dígitos** do telefone (`:216-217`) usando `ilike '%suffix'`. Quando encontra mais de um lead, reatribui conversas/tarefas/timeline ao primeiro e executa:

```
await adminClient.from("leads").delete().in("id", duplicateIds);
```

Sem soft-delete, sem `timeline_event`, sem confirmação humana. 8 dígitos colidem entre DDDs diferentes dentro do mesmo tenant.

**Impacto:** perda irreversível de leads legítimos disparada por uma mensagem recebida. Cai direto na No-Fly Zone "Exclusão de dados" do CLAUDE.md.

### PC-035 — `asaas-webhook` vaza o comprimento do token · **BAIXO**

`asaas-webhook/index.ts:10-15`: `if (a.length !== b.length) return false` — curto-circuito por tamanho. `check-signup-gate/index.ts:7-18` já usa a implementação correta (digest SHA-256 dos dois lados, comentário explícito sobre o vazamento). As duas convivem no repositório.

### PC-036 — Nó `webhook` pode exfiltrar qualquer coluna de `leads` · **MÉDIO**

`automation-engine/index.ts:23-32` (`interpolate`) navega paths arbitrários sobre `leadContext`, que é `{...lead, ...context}` — a **linha inteira** da tabela `leads` (`:193-201`). O nó `webhook` interpola URL, headers e body (`:351-366`) e faz `fetch` para fora.

`isStrictWebhookUrl` (`:368`) bloqueia SSRF interno (localhost, IPs privados, metadata), mas não impede envio para um host HTTPS externo qualquer. Quem consegue editar uma automação exfiltra `custom_fields`, notas e qualquer coluna nova que venha a existir em `leads`.

### PC-037 — Handshake permissivo em `whatsapp-cloud-webhook` e `meta-leads-webhook` · **BAIXO-MÉDIO**

`whatsapp-cloud-webhook/index.ts:224-231` — sem `integration_id` na query, aceita o challenge se **qualquer** tenant tiver aquele `verify_token`. `meta-leads-webhook/index.ts:56-69` — mesmo padrão, e responde sem `corsHeaders`.

É a mesma classe de defeito que originou o PC-004, sobrevivendo em duas outras funções. Impacto menor porque o POST subsequente exige HMAC.

---

## 5. Riscos Prováveis (RP)

| ID | Risco | Evidência | Por que é "provável" e não "confirmado" |
|---|---|---|---|
| RP-001 | `automation_queue` não tem `client_id` → RLS por tenant impossível nessa tabela | `automation-engine:335-337` e `:568` (comentários explícitos) | Depende do schema real — Etapa 3 |
| RP-002 | Flag de produção hardcoded: `SDR_PILOT_CLIENT_ID` com fallback de UUID em código | `whatsapp-webhook:687-688` | Funciona, mas troca de tenant exige redeploy se o secret não estiver setado |
| RP-003 | Fallbacks silenciosos mascaram drift de schema e gravam dados alterados | `whatsapp-webhook:582-623` — `safeInsertConversation` troca `channel` para `"whatsapp"` em erro de constraint | Precisa confrontar com o schema em produção |
| RP-004 | Chave de IA por tenant guardada em `integrations.config.api_key` legível pelo service role | `automation-engine:704-719` | Liga-se a PC-005/06 (Base64/`Math.random()`) da Etapa 1 — confirmar na etapa de banco |
| RP-005 | `meta-leads-webhook` cria o client service-role no escopo do **módulo** (`:18-21`), não por requisição | `meta-leads-webhook:18` | Reuso de estado entre invocações no isolate do Deno |
| RP-006 | Outage silencioso de ~1 mês na fila de automações, sem alerta | `20260618_automation_worker_cron_fix.sql` (cabeçalho documenta 21/mai → 18/jun) | Já aconteceu; o risco é recorrência — não há monitor |
| RP-007 | Bucket `whatsapp_media` usa `getPublicUrl` com nome `Date.now()_random(6)` | `whatsapp-webhook:158,165`; `whatsapp-cloud-webhook:93` | Se o bucket for público, mídia de todos os tenants fica acessível — verificar policies de Storage |
| RP-008 | Corrida entre `handle_new_user` (trigger) e `admin-create-user` | `admin-create-user:125-141` (comentário descreve a corrida e o workaround) | Workaround existe; a corrida em si continua |
| RP-009 | Frontend usa `supabase.functions.invoke` direto em 37 pontos, `invokeEdge` (com refresh de sessão) em apenas 12 | `edge-invoke.ts` vs. 20 arquivos com invoke direto | Os 25 pontos sem refresh falham com 401 em sessão perto de expirar |

---

## 6. Hipóteses para as próximas etapas

| ID | Hipótese | Etapa alvo | Como verificar |
|---|---|---|---|
| H-012 | `automation_queue`, `automation_runs` e `whatsapp_message_queue` não têm RLS por tenant | 3 — Banco | `pg_policies` dessas 3 tabelas |
| H-013 | A RPC `read_secret` é `SECURITY DEFINER` com grant amplo demais | 3 — Banco | `\df+ read_secret` + grants |
| H-014 | O bucket `whatsapp_media` é público → mídia cross-tenant acessível por URL | 3 — Storage | `storage.buckets.public` + policies |
| H-015 | Há drift real entre migrations e o schema em produção | 3 — Banco | Existência de `9999_reconcile_drift.sql` + 93 migrations no remoto vs. 84 citadas na Etapa 1 |
| H-016 | A view `automation_runs_summary` não filtra por tenant | 3 — Banco | Definição da view + `security_invoker` |
| H-017 | `useWhatsAppIntegration.ts` ainda carrega o defeito PC-012 | 4 — Frontend | Ler `useWhatsAppIntegration.ts:95-150` |
| H-018 | O builder visual permite salvar grafos cíclicos sem validação | 4 — Frontend | `AutomationCanvas.tsx` (233 linhas) + `AutomationSidebar.tsx` (628 linhas) |
| H-019 | Secrets de edge (`META_APP_SECRET`, `ASAAS_WEBHOOK_TOKEN`, `ALLOWED_ORIGINS`) não estão setados no Supabase self-hosted | 5 — Infra | Painel de secrets. Se `META_APP_SECRET` faltar, `whatsapp-cloud-webhook` e `meta-leads-webhook` rejeitam **tudo** (fail-closed — comportamento correto, mas quebra a integração) |

---

## 7. Quick Wins da camada de API

Ordenados por (impacto ÷ esforço). Nenhum exige mudança de schema.

| # | Ação | Arquivo | Esforço | Resolve |
|---|---|---|---|---|
| 1 | Definir o secret `ALLOWED_ORIGINS` com os domínios reais | secret do Supabase (sem tocar em código) | 5 min | PC-028 |
| 2 | Trocar `\|\| !cfg?.page_id` por match estrito de `page_id` | `meta-leads-webhook/index.ts:114` | 5 min | PC-027 |
| 3 | Adicionar `facebook-messenger-webhook` e `whatsapp-queue-processor` ao `config.toml` com `verify_jwt = false` | `supabase/config.toml` | 10 min | PC-031 |
| 4 | Extrair `verifySignature` de `whatsapp-cloud-webhook` para `_shared/` e aplicar na rota `whatsapp_business_account` do `whatsapp-webhook` | `_shared/` + `whatsapp-webhook:981` | 1 h | PC-026 (metade) |
| 5 | Teto de `steps_executed` (ex.: 50) → marca run como `failed` e para | `automation-engine:780-816` | 30 min | PC-033 |
| 6 | Substituir `timingSafeEqual` do `asaas-webhook` pela versão por digest | `asaas-webhook:10-15` | 10 min | PC-035 |
| 7 | Trocar o `delete` do merge por soft-delete + `timeline_event` | `whatsapp-webhook:243` | 1 h | PC-034 |
| 8 | Remover o polling de `useAutomationWorker` (o `pg_cron` já cobre) | `useAutomationWorker.ts` | 15 min | D-3, parte de PC-025 |
| 9 | Endurecer o guard de `automation-worker`/`whatsapp-queue-processor` para exigir a service key | ambas as funções (**depende do item 8**) | 30 min | PC-030 |
| 10 | Remover o fallback permissivo dos handshakes GET | `whatsapp-cloud-webhook:224-231`, `meta-leads-webhook:56-69` | 20 min | PC-037 |

> Os itens 8 e 9 são um par: derrubar o guard antes de tirar o polling quebra as automações com delay para quem depende do browser.

---

## 8. Backlog Técnico desta etapa

**Bloco A — Autenticação de webhook (prioridade 1)**
- A1. `_shared/meta-signature.ts` — uma implementação de HMAC `X-Hub-Signature-256` para as 4 funções que hoje reimplementam.
- A2. Segredo por integração na rota Evolution do `whatsapp-webhook` (a Evolution API assina com `apikey`, não com HMAC — desenhar o esquema).
- A3. Rate limiting compartilhado (`_shared/rate-limit.ts` com backend em Postgres ou KV), aplicado primeiro em `check-signup-gate`, `ai-chat` e nos 6 webhooks públicos.

**Bloco B — Consolidação dos motores de automação (prioridade 2)**
- B1. Decidir a fonte de verdade: `bots` ou `automations`. Escrever ADR.
- B2. Migrar o motor de bot de dentro do `whatsapp-webhook` para o `automation-engine` ou para função própria — o webhook deve só receber e enfileirar.
- B3. Uma implementação de `interpolate`, com allowlist de campos (fecha PC-036).
- B4. Uma implementação de envio de WhatsApp, atrás do `whatsapp-proxy`.

**Bloco C — Confiabilidade**
- C1. Guardas de ciclo no builder visual (frontend) e no engine (backend).
- C2. Monitor da profundidade de `automation_queue` com alerta (previne recorrência do RP-006).
- C3. Remover os fallbacks silenciosos (`safeInsertConversation`/`safeInsertMessage`) depois de reconciliar o schema — hoje mascaram drift.
- C4. Padronizar todas as chamadas do frontend em `invokeEdge` (RP-009).

**Bloco D — Higiene**
- D1. `ai_assistant`: mover chaves de IA de `integrations.config` para o Vault.
- D2. `SDR_PILOT_CLIENT_ID`: exigir o secret, remover o fallback hardcoded.
- D3. `whatsapp-status-probe` e `facebook-messenger-webhook`: importar `corsHeaders`.
- D4. Testes de contrato para os 6 webhooks públicos (payload assinado válido / inválido / tenant errado).

---

## 9. Decisões que exigem confirmação humana

Segue a regra do CLAUDE.md: **IA sugere, humano aprova**. Nada abaixo foi executado.

### 9.1 Recuperação do repositório (bloqueia todas as etapas seguintes)

1. **Restaurar o working tree local.** O clone de `origin/main` (`4d376ad`) está em
   `/private/tmp/claude-501/.../scratchpad/upixel-restore`. Copiar por cima do diretório de trabalho? Recriar o `.git` local? Precisa da sua decisão — mexer no diretório do projeto sem ordem explícita não é algo que eu faça sozinho.
2. **Aceitar a perda da branch `feat/sdr-fase-0`.** Ela não existe no remoto. O commit `feat(sdr): ativação de campanha e encerramento no dispatcher` está perdido (object store destruído). Se esse trabalho importa, ele precisa ser refeito — ou recuperado de Time Machine / backup, se houver.
3. **Aceitar a perda do relatório da Etapa 1.** `audit/01-auditoria-geral.md` não está no disco nem no remoto. Ou você tem uma cópia (chat, e-mail, outro diretório), ou a Etapa 1 precisa ser reexecutada para que as próximas etapas tenham a linha de base completa.
4. **Investigar a causa.** Duas cópias independentes do projeto perderam exatamente os mesmos diretórios, e o `.git` perdeu `objects/`+`refs/` mas manteve `index`+`config`. Não parece falha de disco — parece um script de limpeza ou uma ferramenta de sync. Vale descobrir antes de restaurar, para não repetir.

### 9.2 No-Fly Zones tocadas pelos achados

| Decisão | Achado | Por que precisa de você |
|---|---|---|
| Adicionar validação HMAC no `whatsapp-webhook` | PC-026 | Integração crítica em produção. Se a Evolution API não assina os payloads, a correção muda o contrato do webhook e pode derrubar o inbound de todos os tenants |
| Trocar o `delete` de leads duplicados por soft-delete | PC-034 | "Exclusão de dados" é No-Fly Zone. Também muda o comportamento de deduplicação que os clientes já conhecem |
| Endurecer o guard de `automation-worker` | PC-030 | Se algum tenant depende do polling do browser (aba aberta) em vez do cron, endurecer o guard para as automações com delay daquele tenant |
| Corrigir o fallback do `meta-leads-webhook` | PC-027 | Tenants com `page_id` vazio hoje **recebem** leads por causa do bug. Corrigir vai parar esse fluxo — precisa saber quais integrações estão nessa situação antes |
| Consolidar os três motores de automação | PC-032, D-1 | Decisão de arquitetura com migração de dados de `bots` → `automations` (ou o inverso) |
| `ALLOWED_ORIGINS` | PC-028 | Precisa da lista definitiva de domínios (raiz + wildcard de subdomínio de tenant + previews) — restringir errado quebra o app |

---

## 10. Rastreabilidade

Todos os caminhos são relativos à raiz do repositório, no commit `4d376ad` de `origin/main`.

| Achado | Arquivo:linha |
|---|---|
| PC-026 | `supabase/functions/whatsapp-webhook/index.ts:702,839,981`; `supabase/config.toml:5-6` |
| PC-027 | `supabase/functions/meta-leads-webhook/index.ts:111-121` |
| PC-028 | `supabase/functions/_shared/cors.ts:2` |
| PC-029 | (ausência) — `supabase/functions/**` |
| PC-030 | `supabase/functions/automation-worker/index.ts:20-26`; `supabase/functions/whatsapp-queue-processor/index.ts:92-98` |
| PC-031 | `supabase/config.toml:1-21`; `supabase/functions/facebook-messenger-webhook/index.ts` |
| PC-032 | `supabase/functions/whatsapp-webhook/index.ts:402-560` |
| PC-033 | `supabase/functions/automation-engine/index.ts:213-227,780-816` |
| PC-034 | `supabase/functions/whatsapp-webhook/index.ts:215-246` |
| PC-035 | `supabase/functions/asaas-webhook/index.ts:10-15` |
| PC-036 | `supabase/functions/automation-engine/index.ts:20-33,193-201,350-381` |
| PC-037 | `supabase/functions/whatsapp-cloud-webhook/index.ts:224-231`; `supabase/functions/meta-leads-webhook/index.ts:56-69` |
| PC-011 (confirmado) | `src/components/automations/ComplexTab.tsx:23-26`; `src/contexts/AppContext.tsx:658-670` |
| PC-004 (resolvido) | `supabase/functions/whatsapp-webhook/index.ts:956-963` |
| H-011 (refutado) | `supabase/functions/admin-create-user/index.ts:33-42` |

**Arquivos lidos por completo:** os 8 edge functions do escopo, `_shared/cors.ts`, `src/hooks/useAutomationWorker.ts`, `src/hooks/useAutomationRuns.ts`, `src/hooks/useSequences.ts`, `src/lib/edge-invoke.ts`, `src/lib/edge-error.ts`, `src/services/automations.ts`, `src/components/automations/ComplexTab.tsx`, `supabase/config.toml`, `supabase/migrations/20260618_automation_worker_cron_fix.sql`.

**Lido parcialmente:** `supabase/functions/whatsapp-queue-processor/index.ts`, `src/contexts/AppContext.tsx`.

**Varredura automatizada (não leitura integral):** as 33 funções, para montar a tabela do §2 (padrões `verify_jwt`, `corsHeaders`, `auth.getUser()`, `SERVICE_ROLE_KEY`, HMAC/token, `client_id`/`tenant_id`).

**Não lido:** `src/components/automations/canvas/*` (851 linhas), `BotsTab.tsx`, `SequencesTab.tsx`, `RulesTab.tsx`, `InstagramFunnelsTab.tsx`, `TimeActionsTab.tsx`, `AutomationEditModal.tsx`, `BotImportExportModal.tsx` — o briefing pedia "listar arquivos, ler os principais"; foi lido o principal (`ComplexTab.tsx`, alvo do PC-011). Os demais ficam para a etapa de frontend (H-018).

---

*Etapa 2 — uPixel CRM — Sistema Vibe Coding Totum v3.0 — 2026-08-09*
