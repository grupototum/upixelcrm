# Auditoria CRM UI — tela `/crm` + bug Gerenciar Tags

> Bloco A do prompt `revisao-crm-e-tags.md`. Só leitura — nenhum código foi alterado.
> **Stop-point desta auditoria: aguarda Rael priorizar antes de qualquer fix (Bloco B).**
> Isso vale para B1, B3 e B4 também, não só para a decisão de UX do B2.

## A1 — Espaço em branco enorme no kanban: causa encontrada

`src/pages/CRMPage.tsx` monta o board com `DndContext` → `SortableContext` (colunas, horizontal)
→ `KanbanColumn` por coluna → dentro de cada uma, outro `SortableContext` (leads, vertical) →
`SortableLeadCard`. O board inteiro (`CRMPage.tsx:637`) é `flex h-[calc(100vh-4rem)] overflow-x-auto`
— isso está correto, é a altura da tela toda menos o header.

**A causa real está em `src/components/crm/KanbanColumn.tsx:222`:**

```tsx
className={`overflow-y-auto pb-4 rounded-xl p-1 transition-colors ${isOver ? "..." : ""}`}
style={{ height: "calc(100vh - 220px)" }}
```

Não é `min-height`, não é `flex-1` mal aplicado, não é placeholder de DnD que não colapsa —
é uma **altura fixa (`height`, não `max-height`)** no container scrollável de cards de cada
coluna. Uma coluna com 2 leads reserva a mesma altura de tela que uma coluna com 50 — o espaço
"vazio" que aparece na screenshot do Rael é literalmente esse `div` esticado até
`calc(100vh - 220px)`, com só 1-2 cards no topo e o resto vazio.

**Candidato a fix (B3, não implementado agora):** trocar `height` por `max-height` no mesmo
valor. Isso permite a coluna encolher para o conteúdo quando há poucos leads, e ainda limita
o scroll quando há muitos. Efeito colateral a testar: o virtualizador (`@tanstack/react-virtual`,
`shouldVirtualize` acima de 20 leads) mede `scrollContainerRef` para calcular posições — trocar
`height` por `max-height` não deve quebrar isso, mas precisa verificar visualmente após o fix
(colunas com >20 leads ativam a virtualização; testar as duas branches, virtualizada e não).

## A2 — Dropdown "Etapas do Funil" mistura pipelines: confirmado

`src/pages/LeadProfilePage.tsx:552-567` é exatamente o código citado no prompt original —
`.map` flat sobre `columns`, sem agrupar por `pipeline_id`.

Confirmado nesta auditoria:
- **`pipelines` existe e é carregado** em `src/contexts/AppContext.tsx` (`pipelines: Pipeline[]`,
  `useState` na linha ~100, populado no load inicial junto com columns/tasks/automations).
- **`columns[i].pipeline_id` está populado** — usado em outro lugar do mesmo arquivo
  (`LeadProfilePage.tsx:600`, `def.visible_pipelines.includes(column.pipeline_id)`), então o dado
  já existe e já é usado com esse formato em outro contexto da mesma página.
- **Gap para o fix (B1):** `LeadProfilePage.tsx:73-78` destrutura `useAppState()` mas **não inclui
  `pipelines`** na lista atual (`leads, columns, tasks, timeline, automations, ...`). O fix
  precisa adicionar `pipelines` a essa desestruturação antes de poder agrupar por ele.
- Quantidade de pipelines por tenant: não medido nesta rodada (depende de dado de produção,
  fora do escopo de leitura de código) — mas o próprio sintoma relatado por Rael ("várias 'Novos
  Leads'") já confirma que há mais de 1 pipeline no tenant afetado.

## A3 — Clique no card do lead: impacto de migrar pra modal

`src/pages/CRMPage.tsx` (linha ~652): `onLeadClick={(lead) => navigate(\`/leads/${lead.id}\`)}`.
`src/components/crm/SortableLeadCard.tsx:103-110`: `handleCardClick` só encaminha pro `onClick()`
prop quando não está em modo de seleção múltipla (`selectionMode`) — nesse modo, o clique
alterna seleção em vez de abrir o lead. Isso precisa ser preservado em qualquer implementação
de modal.

**Quem mais linka pra `/leads/:id`** (grep completo em `src/`, fora de `CRMPage.tsx` e
`LeadProfilePage.tsx`):

| Arquivo | Contexto provável |
|---|---|
| `src/components/tasks/TaskRow.tsx` | Link direto de uma tarefa pro lead dela |
| `src/hooks/useGoalsProgress.ts` | Provavelmente link em relatório/detalhe de meta |
| `src/hooks/useBreadcrumbs.ts` | Breadcrumb da própria `LeadProfilePage` |
| `src/pages/InboxPage.tsx` | Link do lead a partir de uma conversa |
| `src/pages/ContactsPage.tsx` | Lista de contatos → perfil do lead |
| `src/pages/AutomationRunsPage.tsx` | Execução de automação → lead afetado |
| `src/pages/DuplicatesPage.tsx` | Tela de merge de duplicatas → cada lead |
| `src/pages/TasksPage.tsx` | Lista de tarefas → lead da tarefa |

**São no mínimo 8 lugares fora do kanban** que dependem da rota `/leads/:id` continuar
funcionando como página cheia. Confirma a recomendação do próprio prompt: **manter a rota
intacta**, só trocar o `onClick` do card do kanban para abrir modal — os outros 8 continuam
navegando normalmente.

**Decisão de UX pendente (bloqueia B2 especificamente, não B1/B3/B4):** modal fullscreen,
drawer lateral (`Sheet`), ou `Dialog` padrão. `LeadProfilePage.tsx` tem múltiplas seções (dados
do lead, tags, funil, tarefas, timeline, automação) — reusar a página inteira dentro de um
`Dialog`/`Sheet` como wrapper é mais barato que recriar um `LeadDetailModal` do zero, mas o
scroll interno de uma página inteira dentro de um dialog de altura limitada é o ponto de atenção
de UX a decidir. Sem opinião forçada aqui — aguardando Rael escolher, como o prompt pede.

## A4 — Link `/leads/:uuid` não amigável: escopo confirmado 🟠

`src/App.tsx` tem a rota `/leads/:id` (usada por todos os 8+ pontos listados em A3, mais
`CRMPage.tsx` e `LeadProfilePage.tsx`). Migrar para slug amigável exige:
- Coluna `slug` nova em `leads` (migration — schema change).
- Backfill de todos os leads existentes.
- Rota que aceite **ambos** UUID e slug (regex para diferenciar).
- Atualizar os 8+ call sites listados acima (não são poucos).
- Links já compartilhados externamente (WhatsApp/email) com UUID continuam precisando funcionar.

**Escopo 🟠 confirmado, como o prompt já antecipava.** Não implementado — spec completa em
`SPEC-LEAD-SLUG.md` (Bloco C).

## A5 — Bug "Gerenciar Tags": diagnóstico completo em `TAGS-BUG-DIAGNOSE.md`

Ver arquivo separado — causa raiz confirmada como **schema drift** (`tags.client_id` não existe,
coluna real é `tenant_id`), não RLS. Detalhe completo, incluindo a consulta que confirma a coluna
real da tabela em produção, está no MD dedicado.

`TagsManager` (`src/components/crm/TagsManager.tsx`) é usado **só** em
`src/pages/LeadProfilePage.tsx:538` — não há segundo ponto de entrada. O relato "quando estou na
tela de leads dá erro" bate com isso: o gatilho é o modal "Gerenciar Tags" dentro do perfil do
lead (alcançado a partir de um clique no card do `/crm`), não algo direto na tela do kanban.

## A6 — "Revisar UI da tela toda": limite proposto

Escopo de "revisar UI toda" é vago por natureza. Proponho limitar a: **tela `/crm` (kanban) +
modal/página de detalhe do lead** — que é exatamente o que A1-A5 já cobrem. Não expandir para
outras telas (Inbox, Tarefas, Configurações etc.) neste ciclo.

**Problemas de UI levantados durante a leitura, priorizados (não implementados):**

| Prioridade | Problema | Onde |
|---|---|---|
| Crítico (já é A1) | Espaço vertical vazio em colunas com poucos leads | `KanbanColumn.tsx:222` |
| Médio (já é A2) | Dropdown de etapas sem agrupar por pipeline | `LeadProfilePage.tsx:552-567` |
| Cosmético | Campos personalizados com muito espaço em branco (screenshot 2 do Rael, "Segmento"/"Faturamento Mensal") | Não localizado nesta rodada — precisa da screenshot/tela real para apontar o componente exato; candidato a nova auditoria pontual se Rael priorizar |
| Observação, não bug | "Oficina do Corpo" duplicado em Segmento/Faturamento — dado de negócio, não código (confirma a suspeita do próprio prompt) | Dado do lead, não há fix de código |

O item "campos personalizados com espaço em branco" não pôde ser localizado com precisão de
arquivo/linha nesta auditoria (a screenshot 2 mencionada no prompt não estava disponível para
mim nesta sessão) — se Rael priorizar esse ponto, precisa de uma screenshot atual ou nome do
componente para eu localizar exatamente.

---

**Resumo do que fica esperando decisão do Rael:**
- Prioridade de execução entre B1/B2/B3/B4 (podem rodar em qualquer ordem, são independentes
  entre si no código, exceto B4 que toca os modais criados/tocados pelos outros).
- Escolha de UX do B2 (fullscreen / drawer / dialog).
- Se o item cosmético de A6 (campos personalizados) entra neste ciclo ou fica pra depois.
