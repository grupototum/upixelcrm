# Relatório de Teste — Automation Builder

**Alvo:** `https://totum.upixel.app/automations/builder/1c455b51-9480-4509-b65d-f5d4350390d9`
**Fluxo:** "Nova Automação 2" · status **Pausado (draft)**
**Data:** 2026-07-24
**Métodos:** Caixa Branca (código-fonte) · Caixa Preta (navegador autenticado) · Caixa Cinza (UI × engine)

---

## VEREDITO

> ### ❌ Este fluxo NÃO funciona. Nem 0%.
>
> Há **duas falhas independentes**, cada uma suficiente para impedir qualquer execução:
>
> 1. **O fluxo está vazio** — 1 nó de gatilho, 0 conexões, e está pausado.
> 2. **Existe um bug de integração no produto** que impede que *qualquer* fluxo
>    disparado por mensagem funcione, mesmo que fosse desenhado corretamente.

O item 2 é o mais grave: não é problema deste fluxo, é do sistema inteiro.

---

## CAIXA PRETA — o que está publicado

Acessado ao vivo, autenticado, via extensão do navegador.

Leitura direta do DOM do React Flow:

```json
{ "nodeCount": 1, "edgeCount": 0,
  "nodes": [{ "type": "trigger", "text": "Gatilho (Trigger) — Início do Fluxo" }] }
```

| Verificação | Resultado |
|---|---|
| Página carrega | ✅ OK |
| Paleta de módulos renderiza (10 tipos) | ✅ OK |
| Nós no canvas | ❌ **1** (só o gatilho) |
| Conexões (edges) | ❌ **0** |
| Status | ❌ **Pausado** |
| Botão "Testar Fluxo" | ❌ **Não faz nada** |

**Conclusão caixa preta:** o fluxo é um esqueleto em branco. Um gatilho sem
nenhuma ação ligada. Mesmo ativado, o engine cairia em `nextNodeId = null`
e encerraria o run imediatamente como `completed`, sem efeito nenhum.

---

## CAIXA BRANCA — o código por trás

### ✅ O que está bem construído

A arquitetura é sólida e mais madura do que o estado do fluxo sugere:

- **Paridade total UI ↔ engine.** Os 10 tipos da paleta
  (`trigger`, `message`, `send_media`, `wait_for_reply`, `action`,
  `condition`, `delay`, `randomizer`, `webhook`, `ai_assistant`)
  têm todos executor correspondente em `automation-engine/index.ts`.
  Não há nó "decorativo" no canvas.
- **Todos os 10 têm painel de configuração** em `AutomationSidebar.tsx`.
- **Persistência funciona** — `updateAutomationNodes` grava `nodes`/`edges`
  em `automations` com feedback de erro.
- **Fila com retry exponencial** (2/4/8/16 min, `MAX_RETRIES = 4`).
- **Runs rastreáveis** — `automation_runs` com `running`/`waiting`/`completed`/`failed`,
  proteção anti-reenroll, retomada de `wait_for_reply` pelo webhook.
- **Interpolação `{{variavel}}`** funcional em texto, URL, body e datas.
- **Condições** suportam grupos aninhados AND/OR.

### 🔴 P0-1 — Gatilho de mensagem nunca dispara (bug de produto)

**Este é o achado mais importante do relatório.**

A UI grava tipos de gatilho que o backend nunca procura.

`TriggerConfig.tsx:21-29` — o que a UI grava em `node.data.type`:

```
new_lead · status_change · tag_added · field_changed
message_received · message_received_whatsapp
message_received_instagram · message_received_email · message_received_webchat
```

`whatsapp-webhook/index.ts:742` — o que o backend envia ao receber mensagem:

```ts
triggerAutomations(adminClient, clientId, "new_message", conv.lead_id, {...})
```

`whatsapp-webhook/index.ts:360` — como ele casa o gatilho:

```ts
nodes.filter(n => n.type === 'trigger' && n.data?.type === eventType)
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^
//  compara "message_received_whatsapp" (UI) === "new_message" (webhook)
//  → SEMPRE false. Interseção zero.
```

**Efeito:** nenhum fluxo com gatilho de mensagem — as 5 opções mais usadas do
menu — jamais será disparado. Confirmado por varredura: nenhum ponto do
código traduz `message_received*` para `new_message`.

O mesmo defeito atinge o filtro de palavras-chave em
`automation-engine/index.ts:206`, que testa `nodeData.type === 'new_message'`
— valor que a UI nunca produz. O campo "Palavras-chave" do builder é inerte.

### 🔴 P0-2 — Só o WhatsApp (Evolution) dispara automação

Varredura de quem chama `automation-engine`:

| Webhook | Dispara automação? |
|---|---|
| `whatsapp-webhook` (Evolution) | ⚠️ chama, mas com o tipo errado (P0-1) |
| `instagram-webhook` | ❌ **não chama** |
| `facebook-messenger-webhook` | ❌ **não chama** |
| `whatsapp-cloud-webhook` | ❌ **não chama** |

As opções "Mensagem via Instagram", "via Email" e "via Webchat" do builder são
puramente decorativas — não existe emissor para elas em lugar nenhum.

### 🟠 P1-3 — Sem proteção contra loop infinito

`automation-engine` chama a si mesmo por HTTP a cada nó (linha 719) e **não tem
limite de passos, contador de profundidade nem detecção de ciclo.**

O campo que deveria contar passos está quebrado:

```ts
steps_executed: (leadContext._steps_executed ?? 0) + 1   // linhas 513 e 711
```

`_steps_executed` nunca é **escrito** em `leadContext` — só lido. Resultado:
sempre `1`. Não há guard algum.

**Risco:** o canvas permite ligar um nó de volta a um anterior. Um ciclo
= recursão infinita de Edge Functions, consumindo cota e podendo disparar
mensagens em loop para o lead. Precisa de guard antes de liberar uso amplo.

### 🟠 P1-4 — Delays dependem de configuração manual do banco

`20260428_automation_worker_cron.sql` agenda o worker a cada minuto, mas exige
que dois settings existam no banco:

```sql
ALTER DATABASE postgres SET app.supabase_url     = 'https://<PROJECT>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<SERVICE_ROLE_KEY>';
```

Se não estiverem definidos, `current_setting(...)` retorna vazio, o POST vai
para URL inválida e **todo item com delay/timeout trava em `pending` para sempre.**

O fallback é `useAutomationWorker.ts` — polling de 1 min **que só roda enquanto
alguém está com o CRM aberto no navegador.** Automação de produção não pode
depender de aba aberta.

➡️ **Verificar em produção:** `SELECT * FROM cron.job WHERE jobname = 'automation-worker';`

### 🟠 P1-5 — "Testar Fluxo" é um botão morto

`AutomationBuilderPage.tsx:69-72`:

```tsx
<Button variant="outline" size="sm" className="h-8 gap-2">
  <Play className="h-3.5 w-3.5" />
  Testar Fluxo
</Button>
```

Sem `onClick`. Não há como testar um fluxo dentro do produto — exatamente o que
teria revelado os bugs acima antes de chegarem à produção.

### 🟡 P2 — Menores

| # | Problema | Local |
|---|---|---|
| 6 | Gatilho `field_changed` não tem emissor em lugar nenhum | `TriggerConfig.tsx:24` |
| 7 | Canal Email não implementado: `"Email automation not fully implemented"` | `engine:491` |
| 8 | `new_lead`/`status_change`/`tag_added` disparam pelo **frontend** — só com navegador aberto | `AppContext.tsx:829` |
| 9 | `recordOutboundMessage` casa conversa por `ilike` nos últimos 8 dígitos — risco de colisão | `engine:761` |
| 10 | Sem validação de fluxo ao salvar (aceita nó órfão, fluxo sem gatilho, ciclo) | `AppContext.tsx:643` |

---

## CAIXA CINZA — UI × Engine

Cruzamento do que o builder oferece contra o que a execução entrega.

| Nó | Config UI | Executor | Dispara de verdade? |
|---|---|---|---|
| Gatilho `new_lead` | ✅ | ✅ | ⚠️ Sim (frontend + webhook wpp) |
| Gatilho `status_change` | ✅ | ✅ | ⚠️ Só com navegador aberto |
| Gatilho `tag_added` | ✅ | ✅ | ⚠️ Só com navegador aberto |
| Gatilho `field_changed` | ✅ | ✅ | ❌ **Sem emissor** |
| Gatilho `message_received*` (5 opções) | ✅ | ✅ | ❌ **Nunca casa (P0-1)** |
| Enviar Mensagem — WhatsApp | ✅ | ✅ | ✅ |
| Enviar Mensagem — Email | ✅ | ❌ stub | ❌ **Não implementado** |
| Enviar Mídia | ✅ | ✅ | ✅ |
| Aguardar Resposta | ✅ | ✅ | ⚠️ Retoma só via WhatsApp Evolution |
| Ação CRM (tag/etapa/responsável/nota) | ✅ | ✅ | ✅ |
| Condição (If) | ✅ | ✅ | ✅ |
| Espera (Delay) | ✅ | ✅ | ⚠️ Depende do cron (P1-4) |
| Teste A/B | ✅ | ✅ | ✅ |
| Webhook HTTP | ✅ | ✅ | ✅ |
| Assistente IA | ✅ | ✅ | ⚠️ Exige `OPENAI_API_KEY` |

**Leitura:** o miolo de execução está bom. O que está quebrado é a **borda de
entrada** — o que faz o fluxo começar. Um motor bem construído sem chave de ignição.

---

## O QUE PRECISA SER FEITO

### Consertar (ordem de prioridade)

**1. Normalizar os tipos de gatilho — P0, destrava o produto inteiro**

Uma função compartilhada de matching, usada por todos os webhooks. A correção
mais enxuta é casar por prefixo de canal em vez de igualdade exata:

```ts
// supabase/functions/_shared/trigger-match.ts
export function triggerMatches(nodeType: string, event: string, channel: string) {
  if (nodeType === event) return true;
  if (event === "new_message" || event.startsWith("message_received")) {
    return nodeType === "message_received"                 // qualquer canal
        || nodeType === `message_received_${channel}`;     // canal específico
  }
  return false;
}
```

Aplicar em `whatsapp-webhook:360` **e** no filtro de keywords do
`automation-engine:206`. Sem isso, nada mais importa.

**2. Ligar os demais webhooks** — Instagram, Messenger e WhatsApp Cloud precisam
chamar `triggerAutomations` como o Evolution já faz. Ou remover essas opções da
UI, para não prometer o que não entrega.

**3. Loop guard no engine** — propagar de fato o contador e cortar:

```ts
const steps = (leadContext._steps_executed ?? 0) + 1;
if (steps > 100) throw new Error("Limite de passos excedido — possível loop");
// e escrever de volta no contexto repassado ao próximo nó:
leadContext._steps_executed = steps;
```

**4. Confirmar o cron em produção** — rodar o `SELECT` acima. Se não houver job,
definir os dois settings e reaplicar a migration. Enquanto isso não for feito,
nenhum delay conclui sem navegador aberto.

**5. Implementar "Testar Fluxo"** — executar o fluxo contra um lead de teste com
`dry_run`, mostrando o caminho percorrido e o payload de cada nó. É a ferramenta
que teria evitado este relatório.

### Construir (este fluxo específico)

O fluxo `1c455b51` está vazio. Depois dos consertos acima, ele precisa de:

1. Configurar o gatilho (hoje sem tipo definido)
2. Adicionar ao menos um nó de ação e **conectá-lo** ao gatilho
3. Ativar (sair de "Pausado")

---

## COMO VALIDAR DEPOIS DA CORREÇÃO

1. Fluxo de fumaça: `Gatilho (mensagem WhatsApp)` → `Enviar Mensagem` → ativar
2. Mandar mensagem real para o número conectado
3. Conferir `automation_runs` → deve existir run `completed`
4. Conferir `automation_executions` → 2 linhas, `status = success`
5. Repetir com um `Delay` de 2 min no meio → validar que a fila destrava sozinha
   **com o navegador fechado** (prova o cron)

---

## Limitações deste teste

- Não executei o fluxo ao vivo — está vazio e pausado, não haveria o que observar.
- Não li a tabela `automations` direto no banco (a chave anon não é extraível do
  bundle); a estrutura veio do DOM do React Flow, que reflete o dado carregado.
- Os itens P1-4 (cron) e P2-7 (`OPENAI_API_KEY`) dependem de config de ambiente
  em produção — apontei o comando de verificação, mas não pude executá-lo.
