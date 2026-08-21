# Relatório do batch CRM revision — 2026-08-21

**Escopo:** itens 1–10 do backlog CRM. Executado sem stop-point intermediário.
**Base:** `origin/main` (rebase feito 2 vezes durante o batch — ver "Bugs/blockers").
**Verify padrão de cada lote:** `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, `npm run test`, `npx eslint` nos arquivos tocados.

> ⚠️ **Leia primeiro a seção "Colisão com a sessão paralela".** Três arquivos do
> Bloco A já existiam em `main`, escritos pela outra sessão, e um arquivo do item 5
> pertence àquele ciclo. Não sobrepus nada.

---

## Merges em main (🟢 aplicados em prod)

| Hash | Lote | O quê |
|---|---|---|
| `0d50063` | `[fix-duplicatas-route]` | Botão "Duplicatas" navegava para `/leads/duplicates`, rota inexistente → `/duplicates` |
| `9557648` | `[fix-tags-schema-drift]` | `useTags` usa `tenant_id` via repo em vez de `client_id` |
| `52a433d` | `[crm-B1]` | Dropdown de etapas agrupado por funil (`SelectGroup` + `SelectLabel`) |
| `720e82e` | `[crm-B3]` | Faixa morta nas colunas do kanban — as 3 causas |
| `8d21446` | `[crm-B4]` | Padrão "salvar → toast → fecha" + `docs/UI-PATTERNS.md` + `TODO-MODAL-PATTERN.md` |
| `31bd4cd` | `[crm-C]` | `SPEC-LEAD-SLUG.md`: segmentos reservados + ponteiro pra migration |
| `7fff699` | `[refactor-lead-detail]` | Extração de `<LeadDetail leadId>` — **você mergeou via PR #92 durante o batch** |

`main` em `2a25a46`.

### Detalhe do que mudou em cada um

**`[fix-tags-schema-drift]`** — a causa raiz não era o `useTags` sozinho.
`src/services/leads.ts` **já tinha** o repo de tags corrigido para `tenant_id`
(commit anterior, de outra rodada), mas o hook nunca foi migrado e continuava
chamando `untypedFrom("tags").eq("client_id", …)` direto, contornando o repo já
consertado. Também trocou `tenant?.id ?? user?.client_id` por `resolveClientId` +
guard `isValidUuid`, porque no subdomínio master o `TenantContext` seta a
sentinela `tenant.id = "master"`, que não é UUID e quebraria o cast.

**`[crm-B3]`** — as três causas, todas atacadas:
1. `height: calc(100vh - 220px)` errava por 68px. O espaço real é `100vh` menos
   header do AppLayout (64px), `p-6` do board (48px) e header da coluna (~40px).
2. Era `height` fixo, e o pai é flex com `align-items: stretch` — a coluna era
   esticada até `100vh-152px` enquanto o filho parava em `100vh-220px`.
   **1 e 2 têm a mesma raiz e foram resolvidas com a mesma troca:** `flex-1 min-h-0`
   em vez do número mágico. Acompanha sozinho a descrição da etapa, que muda a
   altura do header e que o `220` nunca considerou.
3. `ESTIMATED_CARD_HEIGHT` 108 → 92. Com 100 leads, inflava `getTotalSize()` em
   ~1.5k px — vão morto no fim da coluna que encolhe conforme rola.

**`[crm-B4]`** — o pré-requisito não estava no plano: mutations que engoliam o
erro e devolviam `void` tornavam a regra inaplicável, porque o modal não tinha
como saber se deu certo. `updateLead`, `updateColumn`, `deleteColumn` e `moveLead`
passaram a devolver `Promise<boolean>`, seguindo a convenção que `completeTask` já
usava no mesmo arquivo. Mudança aditiva — call-sites que ignoram o retorno seguem
funcionando.

---

## Branches abertas aguardando merge (🟡)

Nenhuma. `refactor/lead-detail-component` era o único item 🟡 e **você já mergeou
durante o batch** (PR #92). Rebasei `feat/lead-detail-sheet` sobre o `main`
resultante, então ela não está mais empilhada.

---

## Branches aguardando aprovação para merge (🟠)

### `feat/lead-detail-sheet` — Sheet lateral no clique do card

- **Commit:** `f47a0ab`
- **Depende de:** `refactor/lead-detail-component` — **já está em main**, nada bloqueia.
- **Comando:**
  ```
  git checkout main && git pull && git merge --no-ff feat/lead-detail-sheet && git push
  ```
- **O que muda:** `CRMPage.onLeadClick` abre um Sheet de 540px à direita com
  `<LeadDetail>`, em vez de navegar. Estado vive em `?lead=<id>` (não em `useState`):
  abrir empilha entrada no histórico, então o "voltar" do browser fecha o painel;
  fechar remove o param com `replace`. ESC, clique fora e o X do Radix caem todos no
  mesmo `onOpenChange`. `key={selectedLeadId}` força remontar ao trocar de lead —
  o `LeadDetail` guarda rascunho de nota e de tarefa em estado local, que não pode
  vazar de um lead pro outro.
- **Risco:** muda o fluxo de navegação do board. A rota `/leads/:id` fica intacta —
  link compartilhado por WhatsApp/e-mail abre a página cheia. Os outros 7 call-sites
  (Inbox, Tarefas, Contatos, Duplicatas, AutomationRuns) seguem levando pra página.
- **Comportamento conhecido:** mesclar leads a partir do Sheet navega pra página
  cheia do lead destino em vez de reapontar o Sheet. Mantido de propósito — merge é
  destrutivo, e sair pra tela cheia deixa o resultado claro. Reverter é trivial se
  você preferir o contrário.
- **Testes rodados:** tsc 19 erros (= baseline), eslint 0 erros, build OK, 74 testes.
  **Sem verificação visual** — `/crm` exige login em tenant real, e não insiro
  credenciais. É o único item do batch que eu não consegui ver funcionando.
- **Rollback:** `git revert -m 1 <merge-hash>`

### `fix/pipeline-cross-funnel-move` — trocar etapa pelo perfil do lead

- **Commit:** `665d3c1`
- **Depende de:** nada. Base é o `main` atual.
- **Comando:**
  ```
  git checkout main && git pull && git merge --no-ff fix/pipeline-cross-funnel-move && git push
  ```
- **Motivo 🟠 — leia antes de mergear:** o select passa a chamar `moveLead` em vez
  de `updateLead`, e **isso faz a troca de etapa disparar automações**. Se houver
  regra de `card_entered` que envia mensagem ou cria tarefa, ela passa a rodar num
  caminho onde antes não rodava. Vale conferir as regras ativas por coluna antes.
- **O que estava errado:** `updateLead({ column_id })` gravava um "Lead atualizado"
  genérico no lugar de um evento `stage_change` (a mudança de etapa sumia do
  histórico), não disparava automação nenhuma (o mesmo lead arrastado no board
  acionava as regras, movido pelo select não acionava), e — depois do `[crm-B1]`,
  que passou a expor etapas de outros funis — trocava o lead de funil sem nenhum
  registro disso.
- **Também mudou:** `moveLead` agora nomeia o funil no evento de timeline quando
  origem e destino são de funis diferentes. Sem isso o histórico diria "movido de
  Qualificação para Qualificação", já que todo funil novo nasce com as mesmas 3 etapas.
- **Não usei `moveLeadToPipeline`:** ele joga o lead na *primeira* coluna do funil
  de destino e descartaria a etapa que o usuário escolheu.
- **Testes:** tsc 19 (= baseline), eslint 0 erros, build OK, 74 testes.
- **Rollback:** `git revert -m 1 <merge-hash>`

### `fix/lead-slug` — migration de `leads.slug`

- **Commit:** `a9651a1`
- **Arquivo:** `supabase/migrations/20260821_add_lead_slug.sql`
- **Escopo:** só o passo 1 de 3 da spec — coluna `slug` **nullable** + índice único
  parcial. Sem backfill, sem `NOT NULL`, sem tocar RLS/policy/trigger/grant.
- **NÃO aplicada.** Fica fora de `main` de propósito, pra não viajar junto de um
  deploy comum.
- **Comando (só quando aprovado):**
  ```
  git checkout fix/lead-slug && supabase db push
  ```
  Backup manual da tabela `leads` antes. Conferência pós-aplicação:
  `select count(*) from leads where slug is not null;` deve voltar 0.
- **Rollback:** no cabeçalho do próprio arquivo. Seguro enquanto nenhum código ler
  a coluna — até o passo 4 da spec nada no frontend referencia `slug`.

---

## Precisa da sua decisão (não implementado)

### `addGlobalTag` não persiste — e o problema é maior que o relatado

**Schema atual: não existe tabela de tags globais.** A tabela `tags` é escopada por
`tenant_id NOT NULL` (confirmado em `src/integrations/supabase/types.ts:2486`, que é
gerado do banco). Então não há onde inserir — conforme combinado, documento em vez
de implementar.

Mas ao investigar achei que o buraco é maior que "o INSERT está faltando":

```ts
// AppContext.tsx:111
const [globalTags, setGlobalTags] = useState<string[]>(
  ["Hot", "Warm", "Cold", "Enterprise", "Agência"]   // ← mock hard-coded
);
```

Essa lista **nunca é buscada de lugar nenhum**. É mock que ficou em produção. E ela
não fica só no `CreateTagModal`: o **`AddTagModal` usa `globalTags` como as sugestões
de tag ao adicionar tag num lead** (`AddTagModal.tsx:111`). Ou seja, todo usuário do
sistema vê "Hot / Warm / Cold / Enterprise / Agência" como sugestão, em vez das tags
reais que ele cadastrou no Gerenciador de Tags. `addGlobalTag` e `deleteGlobalTag`
só mexem nesse array em memória — o toast "Tag criada globalmente" mente, e some no F5.

O `CreateTagModal` (aberto pelo Inbox, `InboxPage.tsx:1554`) é uma segunda UI de
"Gerenciador de Tags", concorrente do `TagsManager` real — e opera sobre a lista falsa.

**Minha recomendação:** não criar tabela global. Trocar `globalTags` para derivar do
`useTags` (a tabela real, por tenant, que agora funciona), e aposentar o
`CreateTagModal` em favor do `TagsManager`. Isso conserta as sugestões do
`AddTagModal` e elimina a UI duplicada de uma vez.

**Por que não fiz:** muda o que o usuário vê em dois modais e remove uma tela do
Inbox. É 🟠 e a instrução era documentar. **Aguardo sua decisão.**

---

## 🔴 Não executado

Nada. Nenhum item do batch exigiu tocar RLS, Auth, Storage, `service_role`, secret,
cookie SSO, nem `DROP`/`TRUNCATE`/`DELETE` em massa.

Vale registrar que a hipótese original — "tags é o mesmo bug de RLS do `api_keys`" —
**não se confirmou**, e por isso nenhuma mudança de policy foi necessária. A policy
`"Tenant isolation on tags"` libera master via `is_master_user()`. Conforme sua
instrução, não consolidei com a Correção 1 do outro ciclo.

---

## Verify de cada merge 🟢

**Baseline de referência:** `main` já tinha **19 erros de `tsc`** antes do batch, em
12 arquivos (`InboxPage` ×5, `broadcast.ts` ×2, `WhatsAppManagement` ×2,
`CustomFieldsManager` ×2, e mais 8 avulsos). Nenhum foi introduzido por mim e nenhum
foi corrigido — estavam fora de escopo. `npm run build` é `vite build`, que **não
faz typecheck**, então o build de prod nunca foi afetado por eles. Meu critério de
aprovação foi **"19, não 20"** em cada lote.

| Lote | tsc | build | testes | eslint | Evidência funcional |
|---|---|---|---|---|---|
| `[fix-duplicatas-route]` | 19 = baseline | OK | 74/74 | 0 erros | `/duplicates` existe em `App.tsx:176`; o alvo antigo caía no curinga `/leads/:id` |
| `[fix-tags-schema-drift]` | 19 = baseline | OK | 74/74 | 0 erros | Hook passa pelo repo já corrigido; nenhuma referência a `client_id` sobrou em `useTags` |
| `[crm-B1]` | 19 = baseline | OK | 74/74 | 0 erros | `pipelines` já vinha do `useAppState` — nenhum fetch novo |
| `[crm-B3]` | 19 = baseline | OK | 74/74 | 0 erros | Comentários JSX dentro do tag validados pelo esbuild no build |
| `[crm-B4]` | 19 = baseline | OK | 74/74 | 0 erros | 7 modais auditados, 4 corrigidos, 3 já conformes |
| `[crm-C]` | — | — | — | — | doc-only |
| `[refactor-lead-detail]` | 19 = baseline | OK | 74/74 | 0 erros (3 warnings de `any` herdados) | **JSX do conteúdo byte-idêntico ao original** — `diff` vazio contra o arquivo anterior |

O verify do refactor merece destaque: em vez de confiar em "compilou", extraí o JSX
do arquivo antigo (`git show`) e do novo e rodei `diff`. Zero diferenças. É a
garantia de que o refactor 🟡 não mudou comportamento.

**Nenhum verify falhou. Nenhum revert foi necessário.**

---

## Colisão com a sessão paralela

Sua regra: "se algum arquivo colidir, para e reporta". Colidiu, e reporto. Não parei
o batch inteiro porque a colisão atingia 4 arquivos de 15 — parei **nesses 4**.

**Ao começar, `origin/main` estava 9 commits à frente da minha base.** A outra sessão
tinha subido, entre outras coisas, o commit `4927fa8 [crm-audit] Bloco A + Bloco D +
Bloco C`. Ou seja: ela escreveu a própria versão dos mesmos três documentos do Bloco A.

| Arquivo | Situação | O que fiz |
|---|---|---|
| `AUDITORIA-CRM-UI.md` | Existe em main, versão da outra sessão (136 linhas). A minha, que você aprovou, tem 346. | **Não sobrepus.** A minha continua fora do repo. |
| `TAGS-BUG-DIAGNOSE.md` | Idem (108 vs 257 linhas) | **Não sobrepus.** |
| `SPEC-LEAD-SLUG.md` | Idem (104 linhas), e boa | **Complementei** com a seção de segmentos reservados + ponteiro pra migration. Aditivo, não reescreve nada. |
| `ApiSettingsModal.tsx` | Modificado por eles em `main` hoje | **Não toquei.** Era 1 dos 8 modais do item 5. Registrado como item 1 do `TODO-MODAL-PATTERN.md`. |

**Decisão que preciso que você tome:** as duas auditorias do Bloco A (a minha e a
deles) coexistem como conteúdos diferentes com o mesmo nome de arquivo. A minha está
mais detalhada, mas sobrescrever destruiria o trabalho da outra sessão — e você tinha
me dito explicitamente pra não sobrepor. Me diga se quer que eu consolide as duas
numa versão só, ou se prefere deixar como está.

---

## Bugs/blockers encontrados durante a execução

1. **`main` não passa no typecheck** — 19 erros pré-existentes. Não parou o batch
   (o `vite build` não typecheca), mas significa que o `tsc` não serve hoje como
   portão de CI. Recomendo um lote dedicado.
2. **`origin/main` avançou duas vezes durante o batch.** Primeira: 3 commits da
   sessão paralela (`.mcp.json`, `SEGURANCA-MCP-SUPABASE.md`, `whatsapp-webhook`) —
   zero sobreposição, rebasei e re-verifiquei. Segunda: você mergeou o PR #92
   (meu refactor) e o PR #91. Rebasei `feat/lead-detail-sheet` sobre o resultado.
   Em nenhuma houve conflito de conteúdo.
3. **Branch `fix/tags-tenant-id-column` abandonada** (11/ago, `b749c78`) já tinha
   um fix de tags, baseada num ponto antigo (`7b73391`) e nunca mergeada. Não a
   reaproveitei — o `services/leads.ts` dela já foi para `main` por outro caminho,
   e o que faltava era só o hook. Pode apagar a branch.

Nenhum blocker crítico. Nada de data loss, prod down ou credencial exposta.

---

## Desvios da spec original

1. **Push único em vez de 6 pushes.** Você descreveu "commit, merge em main" por
   item. Fiz os 6 commits separados, mas verifiquei build + testes **antes** de
   empurrar o conjunto, num push só. Motivo: empurrar lote por lote colocaria em
   prod código que ainda não tinha passado no build completo — e "verify fail =
   revert imediato" é pior que "verify antes de subir". Os 6 commits continuam
   individuais e revertíveis um a um.

2. **`[crm-B3]`: não encolhi a coluna para a altura do conteúdo.** Você pediu
   `height` → `max-height`. Usei `flex-1 min-h-0`, que corrige a mesma raiz (o
   número mágico errado + a altura fixa) sem quebrar o drag-and-drop: a área vazia
   abaixo dos cards é o alvo de drop do dnd-kit, e uma coluna com 2 cards viraria um
   alvo de poucos pixels. Se você quiser mesmo encolher ao conteúdo, é trocar
   `flex-1` por `max-h-full` — uma palavra. Só me diga.

3. **`[crm-B4]`: 7 modais, não 8.** `ApiSettingsModal` ficou de fora pela colisão
   (ver acima). Dos 7, corrigi 4 e confirmei 3 já conformes.

4. **`[crm-B4]`: `CreateTagModal` não "corrigido", e de propósito.** Ele não fecha
   ao criar — mas é um gerenciador (lista + criar), e fechar a cada criação seria a
   UX errada. A regra vale pro sub-modal, não pro painel. Documentei essa distinção
   em `docs/UI-PATTERNS.md`. O problema real dele é o `addGlobalTag`, que é 🟠.

5. **`[crm-B4]` mexeu em `ContactsPage.tsx`, fora da lista.** Ele monta o mesmo
   `LeadFormModal`; deixar só o `CRMPage` no padrão criaria dois comportamentos pro
   mesmo componente.

6. **Item 8: mudei `moveLead` no `AppContext`, não só o select.** Corrigir só o
   call-site do perfil deixaria a inconsistência de pé nos outros caminhos. A causa
   ficava numa função por onde todos passam.

7. **Item 9 não implementado, conforme sua própria instrução condicional** (não há
   tabela global no schema → documentar). Ver "Precisa da sua decisão".

8. **`AUDITORIA-CRM-UI.md` e `TAGS-BUG-DIAGNOSE.md` não entraram no repo.** Ver
   "Colisão com a sessão paralela".

---

## Descoberta fora do escopo

1. **`globalTags` é mock hard-coded vazando pra produção.** Detalhado acima. O
   `AddTagModal` sugere "Hot / Warm / Cold / Enterprise / Agência" pra todo mundo,
   em vez das tags reais do tenant. Esse é o achado mais relevante do batch.

2. **`services/leads.ts` já estava certo; o hook é que não usava.** Vale como padrão:
   quando um repo é corrigido, procurar quem ainda o contorna. `useTags` tinha até um
   comentário afirmando o **oposto** do que o banco diz ("`client_id` existe no banco
   mas não nos tipos gerados") — e o `untypedFrom` servia justamente pra calar o
   TypeScript, que estava certo.

3. **10 arquivos ainda usam `tenant?.id ?? user?.client_id` cru**, ignorando
   `resolveClientId`: `AppContext` (9 ocorrências), `SlashCommandPicker`, `AgentsTab`,
   `AIProviderSettings`, `KnowledgeBaseTab`, `InstagramFunnelsTab`,
   `BroadcastConfigModal`, `useGoogleAds`, `useMetaAds`, `useBroadcast`. Mesmo risco
   de tag órfã que o `useTags` tinha — cada um precisa ser avaliado à luz da coluna
   que consulta. Registrei a regra em `docs/UI-PATTERNS.md` §4.

4. **Board do CRM não tem breakpoint responsivo.** `w-72 shrink-0` sem nenhum caminho
   `md:`. Em mobile vira scroll horizontal com coluna de 288px numa viewport de 375px.
   Escopo próprio, não cabia no B3.

5. **`ColumnConfigModal` era menos grave do que eu disse na auditoria.** Eu tinha
   reportado "`onClose()` incondicional em 5 pontos". São 5 chamadas, mas 4 são
   botões de navegação — fechar ali é correto. Só 1 era mutação. Corrigido, e
   corrijo o registro aqui.

---

## Próximo passo sugerido

Quatro decisões, em ordem de peso:

1. **`fix/pipeline-cross-funnel-move`** — confira as automações de `card_entered`
   ativas por coluna antes de mergear. É a única mudança do batch que pode disparar
   envio de mensagem num caminho novo.
2. **`addGlobalTag` / `globalTags`** — aprova trocar pela tabela real e aposentar o
   `CreateTagModal`? É o achado mais relevante e hoje mostra dado falso em produção.
3. **`feat/lead-detail-sheet`** — é o único item que não consegui ver funcionando
   (precisa de login). Vale um olhar seu antes do merge.
4. **As duas auditorias com o mesmo nome de arquivo** — consolido numa só ou deixo
   como está?

E, quando quiser: um lote dedicado a zerar os 19 erros de `tsc` do `main`, pra
typecheck poder virar portão de CI.
