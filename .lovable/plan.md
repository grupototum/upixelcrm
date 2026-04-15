

# Plano: Gatilho de Mensagem Recebida + Condições Avançadas

## Resumo
Adicionar um novo tipo de gatilho "Mensagem Recebida" (com seleção de canal) e expandir o nó de Condição para suportar múltiplas condições, incluindo verificação de conteúdo de mensagem.

## Alterações

### 1. Trigger — Novo tipo "Mensagem Recebida"

**Arquivo:** `src/components/automations/canvas/AutomationSidebar.tsx`

Adicionar ao `case 'trigger'` as novas opções de gatilho:
- `message_received` — Mensagem Recebida (Qualquer Canal)
- `message_received_whatsapp` — Mensagem via WhatsApp
- `message_received_instagram` — Mensagem via Instagram
- `message_received_email` — Mensagem via Email
- `message_received_webchat` — Mensagem via Webchat

Quando `message_received*` for selecionado, exibir campo adicional para filtro opcional de texto (ex: "mensagem contém palavras-chave").

### 2. TriggerNode — Indicador visual de canal

**Arquivo:** `src/components/automations/canvas/nodes/TriggerNode.tsx`

Mostrar um badge/ícone do canal selecionado (WhatsApp, Instagram, etc.) quando o `configType` for do tipo `message_received_*`. Isso dá feedback visual no canvas.

### 3. Condição — Suporte a múltiplas condições

**Arquivo:** `src/components/automations/canvas/AutomationSidebar.tsx`

Refatorar o `case 'condition'` para:
- Permitir adicionar múltiplas condições (lista dinâmica com botão "+ Adicionar Condição")
- Cada condição tem: tipo + operador + valor
- Novos tipos de condição:
  - `message_contains` — Conteúdo da mensagem contém
  - `message_equals` — Conteúdo exato da mensagem
  - `message_starts_with` — Mensagem começa com
  - `message_channel` — Canal da mensagem é (WhatsApp/Instagram/Email/Webchat)
  - Manter os existentes: `has_phone`, `has_email`, `has_tag`
- Operador lógico entre condições: **E** (todas) ou **OU** (qualquer)
- Armazenar em `data.conditions[]` e `data.conditionOperator`

### 4. ConditionNode — Exibir resumo das condições

**Arquivo:** `src/components/automations/canvas/nodes/ConditionNode.tsx`

Exibir na área de conteúdo do nó um resumo das condições configuradas (ex: "Msg contém 'oi' E Canal = WhatsApp"), truncado se necessário.

### 5. NodesPalette — Sem mudanças necessárias

Os nós Trigger e Condition já existem na paleta. As novas opções aparecem na sidebar ao selecionar o nó.

## Detalhes Técnicos

- Dados persistidos no nó via `node.data`:
  - Trigger: `{ configType: 'message_received_whatsapp', keywords?: string }`
  - Condition: `{ conditions: [{ type, operator, value }], conditionOperator: 'and' | 'or' }`
- 4 arquivos modificados: `AutomationSidebar.tsx`, `TriggerNode.tsx`, `ConditionNode.tsx`, e potencialmente `NodesPalette.tsx` (para melhorar o ícone do Mensagem)

