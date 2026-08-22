# AUDITORIA-CRM-UI.md — Tela `/crm` (funil) + perfil do lead

> Última revisão: 2026-08-21 por Claude Code (post-merge PRs #93/#94/#95).
> Versão anterior arquivada em `docs/history/`.
>
> ⚠️ **O corpo deste documento descreve o estado PRÉ-correção.** Foi escrito antes
> do batch, e a maior parte dos achados já foi corrigida. Use a tabela abaixo para
> saber o que ainda vale. O texto original foi preservado sem edição porque ele
> registra o raciocínio do diagnóstico — não é uma lista de tarefas abertas.

## Status dos achados (atualizado 2026-08-21, pós-merge)

| Achado | Situação | Onde |
|---|---|---|
| A1 — faixa morta no kanban | ✅ corrigido | `720e82e` `[crm-B3]` — as 3 causas |
| A2 — dropdown misturando funis | ✅ corrigido | `52a433d` `[crm-B1]` |
| A3 — clique no card abre modal | ✅ implementado como Sheet lateral | `7fff699` (refactor) + `f47a0ab` `[crm-B2]` |
| A4 — link amigável `/leads/<slug>` | 🟠 spec pronta, **não aplicado** | `SPEC-LEAD-SLUG.md`; migration parkeada em `supabase/migrations-pending/` |
| A5 — bug "Gerenciar Tags" | ✅ corrigido | `9557648` — ver `TAGS-BUG-DIAGNOSE.md` |
| A6-1 — botão Duplicatas quebrado | ✅ corrigido | `0d50063` |
| A6-2, A6-3 | ✅ = A2 e A5 | — |
| A6-4 — `addGlobalTag` não persiste | ❌ **ABERTO** | mock ainda em `AppContext.tsx:111`; ver `RELATORIO-CRM-BATCH-20260821.md` |
| A6-5 — espaço morto | ✅ = A1 | — |
| A6-6 — ações só-no-hover | ❌ **ABERTO** | backlog em `TODO-MODAL-PATTERN.md` |
| A6-7 — board sem responsivo | ❌ **ABERTO** | backlog em `TODO-MODAL-PATTERN.md` |
| A6-8 — densidade dos campos personalizados | ❌ **ABERTO** | backlog em `TODO-MODAL-PATTERN.md` |
| A6-9 — "Oficina do Corpo" duplicado | ✅ não era bug — dado ruim, confirmado | — |
| A6-10 — `window.confirm` | ❌ **ABERTO** | backlog em `TODO-MODAL-PATTERN.md` |
| Padrão de modais | ✅ documentado e aplicado em 4 de 7 | `8d21446` `[crm-B4]` → `docs/UI-PATTERNS.md` |

**Correção de registro:** a seção sobre o `ColumnConfigModal` afirma "`onClose()` incondicional
em 5 pontos". São 5 chamadas, mas **4 são botões de navegação** — fechar ali é o comportamento
certo. Só 1 era mutação, e foi essa que o `[crm-B4]` corrigiu.

**Achado surgido depois desta auditoria:** o motor de automações complexas era invocado em
dobro a cada mudança de etapa, duplicando envio de WhatsApp. Corrigido em `a225ed2`. Não está
no corpo abaixo porque só apareceu na auditoria de automações do cleanup pós-merge.

---


**Data:** 2026-08-21
**Bloco:** A — auditoria de leitura, **zero código alterado**
**Escopo proposto:** tela `/crm` (board kanban) + tela/modal de detalhe do lead. Não expande para Inbox, Contatos, Automações.
**Branch:** `claude/orquestrar-totum-prompt-9396de` (worktree isolado, nada commitado)

Bug de tags em documento separado: [TAGS-BUG-DIAGNOSE.md](TAGS-BUG-DIAGNOSE.md).

---

## Sumário executivo

| # | Item | Veredito | Severidade | Escopo |
|---|---|---|---|---|
| A1 | Espaço em branco no kanban | 3 causas identificadas, 1 precisa da screenshot | 🟡 cosmético→médio | 🟢 CSS |
| A2 | Dropdown "Etapas do Funil" misturando pipelines | **Confirmado.** Fix é direto — `pipelines` já está no contexto | 🔴 crítico (risco de mover lead pro funil errado) | 🟢 frontend |
| A3 | Clique no card → modal | Viável. `LeadProfilePage` **não** cabe num modal como está | 🟡 UX | 🟢 frontend, mas refactor real |
| A4 | Link amigável `/leads/<slug>` | Mapeado. 8 call-sites + 1 colisão de rota preexistente | 🟠 schema | só spec |
| A5 | Bug "Gerenciar Tags" | **Palpite de RLS descartado.** Schema drift real | 🔴 crítico | ver doc separado |
| A6 | UI geral da tela | 9 achados, 3 são bugs funcionais | misto | 🟢 frontend |

**Achado não previsto no prompt:** botão "Duplicatas" navega para uma rota que não existe (A6-1). Bug funcional, 1 linha.

---

## A1 — Estado atual do kanban e o espaço em branco

### Como o board é montado

```
AppLayout                        min-h-[100dvh] flex
 └ <main class="flex-1 overflow-auto">        ← scroll próprio
    └ CRMPage
       └ div.board-container      flex h-[calc(100vh-4rem)] overflow-x-auto p-6 gap-5
          └ KanbanColumn (xN)     flex flex-col w-72 shrink-0
             ├ header             mb-3
             ├ description?       (condicional)
             └ div scroll         overflow-y-auto  style={{ height: "calc(100vh - 220px)" }}   ← FIXO
                ├ SortableContext → cards
                └ botão "Adicionar lead"
```

**Não é grid.** É flex row com colunas de largura fixa `w-72` (288px) e `shrink-0`.
Não existe `grid-template-rows`, não existe `min-h-screen`, não existe `flex-1` em coluna vazia.

Arquivos: [CRMPage.tsx:637-678](src/pages/CRMPage.tsx:637), [KanbanColumn.tsx:144-269](src/components/crm/KanbanColumn.tsx:144), [AppLayout.tsx:36-91](src/components/layout/AppLayout.tsx:36).

### Como os cards são renderizados

[KanbanColumn.tsx:227-262](src/components/crm/KanbanColumn.tsx:227) tem **dois caminhos**:

- **≤ 20 leads** → render normal, `<div className="space-y-2">` com um `SortableLeadCard` por lead.
- **> 20 leads** → virtualização com `@tanstack/react-virtual`: um spacer de altura `getTotalSize()` com os cards visíveis em `position:absolute` + `translateY`.

`VIRTUALIZATION_THRESHOLD = 20`, `ESTIMATED_CARD_HEIGHT = 108` ([linhas 20-23](src/components/crm/KanbanColumn.tsx:20)).

### As três causas de espaço vazio, em ordem de probabilidade

#### Causa 1 — altura fixa da coluna (`height: calc(100vh - 220px)`) — **confirmada, é `height`, não `max-height`**

[KanbanColumn.tsx:223](src/components/crm/KanbanColumn.tsx:223)

Uma coluna com 1 card ocupa ~700px de altura em tela de 1080p, dos quais ~600px são fundo vazio.
Isso é **em parte intencional** (área de drop grande é boa UX em kanban), mas é o candidato número 1
para o "div gigante vazio" da screenshot — especialmente se a coluna da screenshot tiver poucos cards.

#### Causa 2 — a conta do `220px` está errada por 68px — **confirmada, é bug matemático**

Altura realmente disponível para o scroll interno da coluna:

```
100vh
 − 64px   header do AppLayout (h-16)
 − 48px   p-6 do board-container (24 topo + 24 base)
 − 40px   header da coluna (h-7 do botão + mb-3)
= 100vh − 152px
```

Mas o código pede `100vh − 220px`. **68px de folga morta no rodapé de toda coluna**, sempre,
independente de conteúdo. E como o pai é `flex` com `align-items: stretch`, a coluna é esticada
até `100vh−152px` enquanto o filho fica em `100vh−220px` → o gap fica visível como fundo.

Com descrição de etapa ([linha 211](src/components/crm/KanbanColumn.tsx:211)) a conta muda de novo —
o número mágico `220` não acompanha nenhuma das variações.

#### Causa 3 — estimativa da virtualização inflada (só em colunas com > 20 leads)

`ESTIMATED_CARD_HEIGHT = 108`. Um card real hoje mede ~85–95px na configuração comum
(nome + telefone + avatar + borda), porque quase toda linha do card é condicional
([SortableLeadCard.tsx:168-222](src/components/crm/SortableLeadCard.tsx:168)) — sem tags, sem valor,
sem segmento, sem próxima tarefa, o card encolhe bastante.

`getTotalSize()` usa a estimativa para todo item ainda não medido. Com 100 leads e ~20 medidos,
o spacer fica ~1.500px maior que o conteúdo real → **espaço morto grande no fim da coluna**,
que encolhe conforme você rola (a assinatura clássica de estimativa errada).

> **Descartado explicitamente:** placeholder do dnd-kit que não colapsa. O `SortableContext` recebe
> todos os ids ([linha 227](src/components/crm/KanbanColumn.tsx:227)), o `DragOverlay` está correto
> ([CRMPage.tsx:680](src/pages/CRMPage.tsx:680)), e o card em drag usa `opacity: 0.4` sem remover do fluxo
> ([SortableLeadCard.tsx:100](src/components/crm/SortableLeadCard.tsx:100)). Não há placeholder fantasma.

### O que falta para eu escolher o fix certo

**Preciso da screenshot** (ou de você me dizer):
- o vazio está **entre dois cards** ou **abaixo do último card**?
- a coluna afetada tinha mais ou menos de 20 leads?

Entre cards + coluna grande → Causa 3.
Abaixo do último card → Causa 1 + 2.

**Fix proposto (B3), independente da resposta:** trocar `height` por `max-height` com a conta correta,
e baixar `ESTIMATED_CARD_HEIGHT` para ~90. Duas linhas.

---

## A2 — Dropdown "Etapas do Funil" — **confirmado**

**Arquivo:** [LeadProfilePage.tsx:553-567](src/pages/LeadProfilePage.tsx:553)

```tsx
<Select value={lead.column_id} onValueChange={...}>
  <SelectContent>
    {columns.map((col) => (            // ← flat, todos os pipelines juntos
      <SelectItem key={col.id} value={col.id}>…{col.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Confirmações pedidas no prompt

| Pergunta | Resposta |
|---|---|
| `columns` vem flat, de todos os pipelines? | **Sim.** [AppContext.tsx:285](src/contexts/AppContext.tsx:285) documenta a decisão: carrega todas as colunas de uma vez, "não por pipeline" — rebuscar a cada troca de funil seria desperdício. |
| `columns.pipeline_id` está populado? | **Sim.** Mapeado no fetch ([AppContext.tsx:188](src/contexts/AppContext.tsx:188)) e tipado em [types/index.ts:24](src/types/index.ts:24). Usado em produção em `moveLeadToPipeline` ([AppContext.tsx:442](src/contexts/AppContext.tsx:442)). |
| Existe hook/context com os pipelines? | **Sim, o mesmo.** `useAppState()` já expõe `pipelines` ([AppContext.tsx:26, 1043](src/contexts/AppContext.tsx:26)). O `LeadProfilePage` só não desestrutura ([linha 75-78](src/pages/LeadProfilePage.tsx:75)). |
| Quantos pipelines existem no tenant? | Variável por tenant. Todo pipeline novo nasce com as etapas **"Novos Leads" / "Qualificação" / "Fechamento"** ([AppContext.tsx:680-682](src/contexts/AppContext.tsx:680)) — é exatamente por isso que a screenshot mostra "Novos Leads" repetido N vezes e "Qualificação" duplicada. Não é dado ruim: é 1 pipeline a mais = 3 etapas homônimas a mais no dropdown. |

### Por que é 🔴 crítico e não cosmético

Duas etapas com o mesmo nome e nenhum diferenciador visual. Escolher a errada **move o lead
para outro funil** — e `updateLead({ column_id })` não passa por `moveLeadToPipeline`,
então a troca de pipeline acontece sem o timeline de "mudou de funil" que a rota correta registra
([AppContext.tsx:449-474](src/contexts/AppContext.tsx:449)). Perda silenciosa de rastreabilidade.

**O board não tem esse problema:** [CRMPage.tsx:282](src/pages/CRMPage.tsx:282) filtra
`columns.filter(c => c.pipeline_id === currentPipelineId)`. Só o perfil do lead esqueceu.

**Fix B1 é exatamente o pseudo-código do prompt** e é seguro — `pipelines` já está disponível,
nenhum fetch novo. Estimo ~25 linhas.

---

## A3 — Clique no card do lead abre modal

### Situação atual

- [CRMPage.tsx:652](src/pages/CRMPage.tsx:652): `onLeadClick={(lead) => navigate(`/leads/${lead.id}`)}`
- [SortableLeadCard.tsx:103-110](src/components/crm/SortableLeadCard.tsx:103): `handleCardClick` respeita `selectionMode` e delega para `onClick()`. **Já está desacoplado da navegação** — trocar o handler no CRMPage basta, o card não muda.

### `LeadProfilePage` cabe num modal?

**Não como está.** É um componente de **1.089 linhas** que:

- lê `useParams<{id}>()` diretamente ([linha 72](src/pages/LeadProfilePage.tsx:72)) — precisaria aceitar `leadId` como prop;
- renderiza o próprio `AppLayout` ([import linha 5](src/pages/LeadProfilePage.tsx:5)) — sidebar + header dentro de um Dialog seria absurdo;
- tem 4 abas (`dados` / notas / tarefas / timeline) + 4 dialogs aninhados próprios (`showTagModal`, `showManageTags`, `showAddField`, `showMergeModal`);
- chama `navigate()` internamente ([linha 1001](src/pages/LeadProfilePage.tsx:1001), no merge de leads).

Reusar por wrapper exige: extrair o miolo para `<LeadDetail leadId>`, deixar `LeadProfilePage`
como casca `AppLayout + LeadDetail`, e o modal montar `LeadDetail` direto. **É refactor de verdade,
não wrapper de 10 linhas** — mas é o caminho certo (evita duplicar 1.000 linhas).

Complicação extra: **dialogs Radix aninhados**. `LeadDetail` já abre Dialogs próprios; colocá-lo
dentro de outro Dialog cria nesting de 2 níveis. Funciona no Radix, mas o gerenciamento de foco
e o `Esc` ficam confusos (Esc fecha o de dentro, o usuário espera fechar o de fora).

### Opções de UX (você escolhe — B2 está bloqueado nisso)

| Opção | A favor | Contra |
|---|---|---|
| **Sheet lateral (Radix Sheet)** — *minha recomendação* | Board continua visível atrás, é o padrão que Pipedrive/Attio usam, largura previsível para conteúdo denso, Esc/click-fora naturais | Conteúdo em 4 abas fica apertado abaixo de ~520px de largura |
| **Dialog fullscreen** | Cabe o layout de 2 colunas atual quase sem mudança | Some com o contexto do board; visualmente pesado; nesting de dialogs mais confuso |
| **Dialog padrão (`max-w-4xl`)** | Menor esforço | O conteúdo atual não cabe — vira scroll dentro de scroll |

**Rota `/leads/:id` permanece** nos três casos. Só o clique interno do card muda.

### Impacto — quem mais linka para `/leads/:id`

8 call-sites, nenhum precisa mudar em B2:

| Arquivo | Linha |
|---|---|
| [TaskRow.tsx](src/components/tasks/TaskRow.tsx:112) | 112 |
| [ContactsPage.tsx](src/pages/ContactsPage.tsx:144) | 144, 183 |
| [LeadProfilePage.tsx](src/pages/LeadProfilePage.tsx:1001) | 1001 (pós-merge) |
| [InboxPage.tsx](src/pages/InboxPage.tsx:1237) | 1237, 1442 |
| [AutomationRunsPage.tsx](src/pages/AutomationRunsPage.tsx:90) | 90 |
| [TasksPage.tsx](src/pages/TasksPage.tsx:249) | 249 |
| [DuplicatesPage.tsx](src/pages/DuplicatesPage.tsx:75) | 75 |
| [CRMPage.tsx](src/pages/CRMPage.tsx:652) | 652 ← **único que vira modal** |

---

## A4 — Link amigável `/leads/<slug>` — 🟠 só documentado

Detalhamento completo vai em `SPEC-LEAD-SLUG.md` (Bloco C). Do lado do impacto, o que a auditoria achou:

- Rota única hoje: [App.tsx:152](src/App.tsx:152) — `/leads/:id`.
- 8 call-sites (tabela em A3) precisariam preferir slug quando disponível.
- **Colisão de rota preexistente** (ver A6-1): já existe um `navigate("/leads/duplicates")` no código.
  Qualquer resolvedor `:idOrSlug` precisa tratar segmentos reservados, ou vai tentar resolver
  um lead chamado "duplicates".
- Migration + backfill + unique index. Links já compartilhados por WhatsApp/e-mail continuam
  funcionando **se e somente se** a rota aceitar UUID para sempre (não só transição).

---

## A5 — Bug "Gerenciar Tags"

Investigação completa em **[TAGS-BUG-DIAGNOSE.md](TAGS-BUG-DIAGNOSE.md)**. Resumo:

- **O palpite de RLS está errado.** A policy de `tags` libera master explicitamente (`is_master_user()`).
- Causa raiz provável: **schema drift** — o código consulta `tags.client_id`, os tipos gerados
  do banco de prod dizem que a coluna não existe (tabela tem `tenant_id NOT NULL`).
- O erro dispara **no load de `/crm`**, não só no modal: `useTags()` é chamado em
  [CRMPage.tsx:175](src/pages/CRMPage.tsx:175) **e** em [TagsManager.tsx:30](src/components/crm/TagsManager.tsx:30).
  Isso explica o "quando estou na tela de leads dá erro".
- **Não consolidar** com a Correção 1 do outro ciclo. Causas diferentes.
- Falta 1 query em prod para fechar (não consegui rodar — MCP do Supabase não autenticado nesta sessão).

---

## A6 — Revisão de UI da tela `/crm` + perfil do lead

Priorizado. **Nada implementado** — tudo aqui é candidato a fix.

### 🔴 Funcionais

**A6-1 — Botão "Duplicatas" leva para rota inexistente**
[CRMPage.tsx:153](src/pages/CRMPage.tsx:153) faz `navigate("/leads/duplicates")`.
Não existe essa rota. Ela cai no curinga `/leads/:id` ([App.tsx:152](src/App.tsx:152)) com `id="duplicates"`,
abrindo o `LeadProfilePage` com lead inexistente. A rota certa é `/duplicates` ([App.tsx:176](src/App.tsx:176)).
**Fix de 1 linha.** Não estava no prompt — achado da varredura.

**A6-2 — Dropdown de etapas mistura pipelines** → A2.

**A6-3 — Tags quebradas** → A5.

**A6-4 — `addGlobalTag` não persiste**
[AppContext.tsx:944-948](src/contexts/AppContext.tsx:944) só faz `setGlobalTags` em memória e
dá `toast.success("Tag criada globalmente")`. A tag some no F5. O toast mente.

### 🟡 UI / UX

**A6-5 — Espaço morto no rodapé de toda coluna** → A1, causas 1 e 2.

**A6-6 — Ações do card só aparecem no hover**
[SortableLeadCard.tsx:142](src/components/crm/SortableLeadCard.tsx:142) — `opacity-0 group-hover:opacity-100`
no bloco com WhatsApp, Ações de Tempo e grip. **Inacessível em touch** (sem hover em tablet).
Mesmo padrão nos botões de editar/excluir tag ([TagsManager.tsx:153](src/components/crm/TagsManager.tsx:153))
e nos de editar/excluir funil ([CRMPage.tsx:522,529](src/pages/CRMPage.tsx:522)).

**A6-7 — Board não é responsivo**
`board-container` é flex row com `w-72 shrink-0` e sem nenhum breakpoint. Em mobile vira
scroll horizontal com coluna de 288px numa viewport de 375px. Não há caminho `md:` em lugar nenhum
da tela. Se mobile importa, é escopo próprio — não cabe em B3.

**A6-8 — "Campos personalizados" com muito espaço em branco (screenshot 2)**
[LeadProfilePage.tsx:573-600](src/pages/LeadProfilePage.tsx:573) — cada definição vira uma linha
via `DynamicFieldRenderer` dentro de `space-y-1`, sem colapsar campo vazio. Diferente dos
"Informações de contato", que usam `EditableDataRow`. Duas densidades visuais diferentes na mesma coluna.

**A6-9 — "Oficina do Corpo" repetido em Segmento e Faturamento Mensal**
**Confirmo o seu palpite: é dado ruim, não bug de código.** Ambos são campos personalizados
livres, renderizados pelo mesmo `DynamicFieldRenderer` sem validação de tipo por campo.
O valor foi digitado (ou importado) errado no campo Faturamento. Vale considerar tipar
"Faturamento Mensal" como `number`/`currency` na definição do campo — mas é configuração do tenant, não código.

**A6-10 — `confirm()` nativo do browser para excluir tag**
[TagsManager.tsx:158](src/components/crm/TagsManager.tsx:158) usa `window.confirm`. O projeto já tem
`AlertDialog` do shadcn e usa em outros pontos ([LeadProfilePage.tsx:31-34](src/pages/LeadProfilePage.tsx:31)).
Inconsistência visual.

---

## Padrão de modal — estado atual (insumo para B4)

Regra nova do projeto: sucesso → toast + fecha; erro → toast com `error.message` + **mantém aberto**;
botão `disabled + loading` durante o request.

| Modal | Fecha só no sucesso? | `disabled` durante request? | Veredito |
|---|---|---|---|
| [`LeadFormModal`](src/components/crm/LeadFormModal.tsx:266) | — | ✅ `submitting` | parcial |
| [`AddTagModal`](src/components/crm/AddTagModal.tsx:26) | ✅ | ✅ `loading` | **OK** |
| [`CreateTagModal`](src/components/crm/CreateTagModal.tsx:21) | ❌ | ❌ | **fora do padrão** |
| [`CreateTaskModal`](src/components/crm/CreateTaskModal.tsx:28) | ✅ | ✅ `loading` | **OK** |
| [`MergeLeadsModal`](src/components/crm/MergeLeadsModal.tsx:30) | ✅ | ✅ `loading` | **OK** |
| [`ColumnConfigModal`](src/components/crm/ColumnConfigModal.tsx:96) | ❌ `onClose()` incondicional em 5 pontos | ❌ | **fora do padrão** |
| [`TagsManager`](src/components/crm/TagsManager.tsx:53) (sub-dialog Nova Tag) | ❌ `setOpen(false)` sempre, mesmo com erro | ❌ | **fora do padrão** |
| [`KanbanColumn`](src/components/crm/KanbanColumn.tsx:134) (Transferir leads) | ❌ + `toast.success` antes de saber o resultado | ❌ | **fora do padrão** |
| `ApiSettingsModal` (outro ciclo) | não auditado | — | ⚠️ avisar antes de tocar |

O caso mais visível é `TagsManager.handleSave` ([linhas 53-71](src/components/crm/TagsManager.tsx:53)):
`await createTag(...)` e em seguida `setOpen(false)` incondicional. `createTag` retorna `null` no erro
e já mostrou o toast vermelho — mas o modal fecha e o usuário perde o que digitou.
**É exatamente o comportamento que a regra nova proíbe.**

`KanbanColumn.handleTransfer` ([linha 134](src/components/crm/KanbanColumn.tsx:134)) é pior:
dispara N `onMoveLead` sem `await` e anuncia `"N leads transferidos"` imediatamente.

---

## Ordem sugerida (você reordena)

| Ordem | Bloco | Por quê aqui | Bloqueio |
|---|---|---|---|
| 1 | **A6-1** (duplicatas) | 1 linha, bug funcional, risco zero | nenhum |
| 2 | **D** (tags) | 🔴 e afeta o load da tela toda | 1 query em prod + decisão sobre master |
| 3 | **B1** (dropdown) | 🔴 e o fix é mecânico | nenhum |
| 4 | **B3** (espaço branco) | cosmético, mas rápido | ideal ter a screenshot |
| 5 | **B4** (padrão de modal) | depende de B1/B2 existirem | nenhum |
| 6 | **B2** (modal no card) | maior esforço (refactor de 1.089 linhas) | **escolha de UX** |
| 7 | **C** (spec slug) | documento, não bloqueia nada | nenhum |

Movi B2 para o fim: é o item mais caro e o único bloqueado numa decisão sua.
Se preferir a ordem original do prompt, é só dizer.

---

## Desvios propostos

Nenhum. Auditoria de leitura, conforme combinado — nenhum arquivo de código foi tocado.

---

## O que preciso de você

1. **Screenshot do kanban** (A1) — o vazio é entre cards ou abaixo do último?
2. **Query da seção 7 do TAGS-BUG-DIAGNOSE** — ou autorizar o MCP do Supabase numa sessão interativa.
3. **UX do B2** — Sheet lateral (recomendo), Dialog fullscreen, ou Dialog padrão?
4. **Ordem dos blocos** — a acima ou a original?
5. Confirmar o **limite de escopo**: `/crm` + detalhe do lead, nada além.

**Stop-point. Aguardo priorização antes de qualquer fix.**
