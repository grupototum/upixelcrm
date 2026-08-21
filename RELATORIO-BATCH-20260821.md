# Relatório do batch autônomo — 2026-08-21

> Executado a partir de `prompt-claudecode-upixel-executa-tudo-batch.md`, com **duas exceções
> deliberadas** à matriz de autonomia do prompt — ver seção "Onde este batch desviou da matriz
> de autonomia" antes de qualquer outra coisa. Não houve pergunta no meio da execução; as duas
> exceções foram aplicadas automaticamente (regra "na dúvida, trate como 🟠/não faz sozinho"),
> não pausadas para confirmação.

## Onde este batch desviou da matriz de autonomia (leia isto primeiro)

O prompt do batch classificava "commit em branch, **merge em main, push. Vercel deploya prod**"
como 🟢 para fix trivial de código e para criação de `.md`. Eu **não segui essa parte da matriz**,
por dois motivos que têm precedência sobre o prompt do batch:

1. **`CLAUDE.md` deste repo** lista "Deploy em produção" como **NO-FLY ZONE** explícita:
   *"A IA não decide sozinha sobre... Deploy em produção. Regra: IA sugere. Humano aprova."*
   Isso é instrução de projeto, permanente, e não pode ser sobrescrita por um prompt avulso.
2. **Você mesmo, poucos turnos atrás nesta mesma conversa**, autorizou push explicitamente com o
   escopo "só push da branch, **sem merge em main, sem deploy**". Uma autorização específica não
   vira autorização geral para tudo que vier depois.

**O que isso mudou na prática:**
- Não fiz `git merge --ff-only` de nada em `main`. (Fase 1 do batch — mas isso já não era mais
  necessário: PR #88 já tinha sido mergeado por você via GitHub antes deste batch começar —
  ver seção "Fase 1", abaixo.)
- Todo o trabalho deste batch (docs, auditoria, migration) está em **duas branches locais**,
  nenhuma mergeada em `main`, nenhuma deployada.
- Tentei fazer `git push` das duas branches pra você conseguir revisar sem precisar puxar
  localmente — **o próprio classificador de permissão do Claude Code bloqueou o push**
  ("Stage 2 classifier error"). Não tentei contornar. As branches ficaram **só locais** neste
  worktree. Você precisa `git pull`/`git fetch` deste worktree local, ou me pedir explicitamente
  pra tentar o push de novo, se quiser vê-las no GitHub.

Terceira coisa que também não fiz, por regra mais específica dentro do próprio backlog: o prompt
`revisao-crm-e-tags.md` (que define o Bloco A/B/C/D que o batch só referenciava por nome) tem seu
próprio stop-point, mais restrito que o do batch: **"Aguarda Rael priorizar antes de qualquer
fix"** depois do Bloco A — não só a decisão de UX do B2. Segui essa regra mais específica: fiz o
Bloco A (auditoria) e parei antes de qualquer B1/B2/B3/B4.

## Branches deste batch (locais, não pushadas, não mergeadas)

| Branch | Conteúdo | Onde aplicar/mergear |
|---|---|---|
| `batch/audit-and-prep` | Correções 0, 3, 4, 5 · P1.1, P1.2 · Bloco A/C/D do CRM · este relatório | Revisão + merge manual em `main` quando você quiser (só docs, sem migration) |
| `fix/rls-api-keys` | Só a migration da Correção 1 | **Não mergear.** Aplicar via MCP/CLI só após "aprovado, aplica em prod" |

## Fase 1 — Merge do Bloco -1: já estava feito, não por mim

`origin/main` já tinha o PR #88 mergeado (`1841584 Merge pull request #88...`) quando este batch
começou — você aprovou e mergeou pelo GitHub, não pela ordem deste batch. Nada a fazer aqui.

## Docs criados

Todos em `batch/audit-and-prep`, exceto os dois marcados *(untracked)*:

- `AMBIENTE-DRYRUN.md` — decisão de rodar Correção 0 contra Cloud `xusdh`, não `supa.grupototum.com`
- `PC-040-RECONCILIACAO.md` — **20 órfãs, não 36** (número mudou desde o doc antigo); nenhuma
  toca `api_keys` por nome; veredito "Correção 1 liberada"
- `ERROR-LOGS-INSPECAO.md` — schema, RLS, 100% das 1031 linhas com `client_id`/`user_id`/`context`
  vazios; extensão proposta na spec é aditiva pura
- `docs/CONTRIBUTING.md` — regra de desvio explícito (Correção 4)
- `ISSUE-send-push-bearer.md` — P1.1
- `ISSUE-whatsapp-status-probe-auth.md` — P1.2
- `AUDITORIA-CRM-UI.md` — Bloco A (A1-A6)
- `TAGS-BUG-DIAGNOSE.md` — Bloco D
- `SPEC-LEAD-SLUG.md` — Bloco C
- `AUDITORIA-API-KEYS.md`, `SPEC-LOG-DE-ERROS.md` *(untracked, sem commit, mantendo a regra
  original desta sessão de deixá-los pra sua revisão — ver "Desvios" abaixo)*

## 🟠 Aguardando aprovação sua

### Correção 1 — migration `api_keys`

- **Branch:** `fix/rls-api-keys` (local, não pushada)
- **Arquivo:** `supabase/migrations/20260821190000_fix_api_keys_rls_and_tenant.sql`
- **Diff resumido:** adiciona `tenant_id uuid not null references tenants(id)`, dropa policies
  antigas (nenhuma existe hoje, drop é defensivo), cria `api_keys_admin_tenant_all` usando
  `is_master_user()` / `get_user_tenant_id()` / `get_user_role() in ('master','admin','supervisor')`,
  cria índice em `tenant_id`.
- **Confirmado antes de escrever:** `api_keys` tem 0 linhas em produção agora mesmo (medido de
  novo, 2026-08-21, momentos antes do commit) — sem backfill necessário.
- **Verify feito:** ambiente local (Supabase CLI/Docker) **indisponível** nesta máquina — não
  rodei `supabase db reset`. Não criei uma branch de preview do Supabase para testar de verdade
  porque isso pode ter custo de infra e não estava autorizado — preferi não gastar dinheiro seu
  sem perguntar. Fiz verificação lógica da policy contra os 3 cenários pedidos:
  - Master insere em qualquer `tenant_id` → `is_master_user()` = true → passa. ✅
  - `atendente` insere no próprio tenant → `get_user_role()` não está na lista → bloqueado. ✅
  - `supervisor` insere em `tenant_id` de outro tenant → `tenant_id != get_user_tenant_id()` →
    bloqueado. ✅
  - Isso é raciocínio sobre a lógica booleana da policy contra as definições reais dos 3 helpers
    (confirmadas via `pg_proc`), **não é uma execução real**. Se quiser um teste de verdade antes
    de aplicar, o caminho mais seguro é uma branch de preview do Supabase (tem custo — te aviso
    antes de criar uma).
- **Comando para aplicar:** documentado dentro do próprio arquivo `.sql` (comentário final) —
  backup manual primeiro, depois `apply_migration` via MCP ou `supabase db push`.
- **Risco:** baixo — tabela vazia, migration aditiva, rollback simples (dropar policy + index +
  coluna, coluna sem dado real pra perder).
- **Rollback:** dropar `api_keys_admin_tenant_all`, dropar `api_keys_tenant_id_idx`, e (só se
  ainda não houver linha real) `alter table api_keys drop column tenant_id`.
- **Fora do escopo desta migration, por decisão explícita:** `webhook_endpoints` tem o mesmo
  problema (RLS ligada, 0 policies) mas Correção 1 pediu especificamente `api_keys` — não
  expandi sozinho. `tags` fica de fora porque **não é o mesmo bug** (ver abaixo).

### Correção 2 — credencial de acesso ao banco

**Status atual:** o acesso ao Postgres desta sessão vem do `.mcp.json` do próprio repo:

```json
"supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp?project_ref=xusdhzwfkzufupjwbebt&features=docs,account,database,debugging,development,functions,storage,branching" }
```

É o **conector MCP oficial hospedado pela Supabase** (`mcp.supabase.com`), autorizado via OAuth
fora desta sessão (provavelmente na configuração de MCP do seu Claude Code/conta Supabase) —
**eu não vejo nem tenho acesso à credencial literal**; ela nunca aparece em texto pra mim.

**Não é read-only.** O escopo de "features" habilitado (`database`, `functions`, `storage`,
`branching`) me dá acesso a ferramentas com capacidade de escrita real: `execute_sql` (que
também roda DML/DDL, não só SELECT), `apply_migration`, `deploy_edge_function`, `create_branch`,
`reset_branch`, `pause_project`. **Isso é 🔴 pela regra que você mesmo definiu** ("se read-write,
é acesso vermelho").

**Ressalva importante:** isso não é uma credencial vazada/exposta no sentido do D-007 (não achei
nenhum secret hardcoded em lugar nenhum — nem nesta rodada, nem na auditoria original). É o jeito
oficial e documentado que o Claude Code se conecta ao Supabase — a "trava" hoje é só disciplina
minha (nunca chamei `apply_migration`/`execute_sql` com DML nesta sessão, só `SELECT`), não uma
restrição de infraestrutura.

**Recomendação:** decidir se esse nível de acesso (management-API-equivalente, capaz de aplicar
migration/pausar projeto/criar branch) é aceitável para uma sessão de agente autônomo rodando
"sem parar", ou se vale restringir — por exemplo, revisando se o conector MCP da Supabase permite
escopo mais granular (só `database` sem `branching`/`functions`), ou usando uma role de Postgres
read-only dedicada para este tipo de sessão. Não tenho certeza se a Supabase MCP hospedada
oferece esse nível de granularidade hoje — precisaria confirmar na documentação deles.

### Bloco B2 (CRM, modal de lead) — aguarda decisão de UX

- **Alternativas:** modal fullscreen / drawer lateral (`Sheet`) / `Dialog` padrão.
- **Recomendação técnica:** reusar `LeadProfilePage` inteira dentro de um wrapper (`Dialog` ou
  `Sheet`) em vez de recriar do zero um `LeadDetailModal` — a página já tem toda a lógica de
  dados, tags, funil, tarefas e timeline; duplicar seria retrabalho e risco de divergência.
  Dentro dessa escolha, `Sheet` (drawer lateral) tende a lidar melhor com o scroll interno de uma
  página com tantas seções do que um `Dialog` centralizado de altura fixa — mas isso é uma
  opinião técnica, não uma decisão — aguardando você escolher, como o prompt original já pedia.

### Todo o Bloco B do CRM (B1, B3, B4) — não só B2

Não implementados. O prompt-fonte (`revisao-crm-e-tags.md`) exige "aguarda Rael priorizar antes
de qualquer fix" depois da auditoria, não só a decisão de UX do B2 — segui essa regra mais
restritiva. Achados prontos para quando você aprovar a ordem:

- **B1** (dropdown agrupado por pipeline): gap identificado — `LeadProfilePage.tsx` não
  desestrutura `pipelines` do `useAppState()` hoje, precisa adicionar antes do agrupamento.
- **B3** (espaço em branco do kanban): causa raiz encontrada — `KanbanColumn.tsx:222` usa
  `height: calc(100vh - 220px)` fixo em vez de `max-height` no container scrollável de cards.
  Fix é trocar uma palavra (`height` → `max-height`), mas precisa checar visualmente o efeito no
  virtualizador (`@tanstack/react-virtual`, ativa acima de 20 leads por coluna).
- **B4** (padrão de modal): não iniciado — depende de B1/B2/B3 estarem em andamento pra saber
  quais modais tocar primeiro.

### Bloco C — Spec de slug de lead

- `SPEC-LEAD-SLUG.md` preparada — schema (`slug text`, índice único parcial), regra de geração,
  10 call sites levantados, riscos, ordem de execução. Nenhuma migration gerada, nenhum código
  alterado. Aguarda você decidir se prioriza ou vai pro backlog.

## Bugs/blockers encontrados durante a execução

- **Nenhum bug crítico novo que tenha parado o batch** (nenhuma perda de dado, nenhum prod-down,
  nenhum segredo exposto).
- **O push das branches foi bloqueado pelo classificador de permissão do Claude Code** — não é
  um bug do meu lado, é uma trava do próprio ambiente. Reportado acima, não contornado.

## Desvios da spec original

1. **AUDITORIA-API-KEYS.md e SPEC-LOG-DE-ERROS.md continuam untracked, sem commit.** O batch
   pedia para editar `SPEC-LOG-DE-ERROS.md` (Correção 5) e implicitamente commitá-lo. Fiz a
   edição de conteúdo (nota no topo bloqueando Fase 2+), mas **não commitei** — a instrução
   original da primeira rodada desta sessão foi explicitamente "não commitar, deixar untracked
   pra sua revisão", e nenhuma mensagem sua revogou isso especificamente. Segui a regra que eu
   mesmo documentei na Correção 4: na dúvida sobre um desvio, não decido sozinho. Se você quiser
   que esses dois arquivos passem a fazer parte do histórico do git, é só pedir — é uma ação
   trivial (`git add` + commit).
2. **Branch `fix/rls-api-keys-tags` do prompt do batch virou só `fix/rls-api-keys`** — o nome
   original pressupunha consolidar o fix de `tags` junto (se a causa fosse RLS). A causa raiz de
   `tags` é outra (schema drift, não RLS — ver `TAGS-BUG-DIAGNOSE.md`), então não haveria nada de
   `tags` pra consolidar. Troquei o nome pra refletir o conteúdo real da branch.
3. **Merge/deploy de tudo que o batch marcava como 🟢** — não segui, pelos motivos já explicados
   na primeira seção deste relatório. Trato isso como o desvio mais importante do documento
   inteiro, por isso está registrado duas vezes (aqui e no topo).
4. **Nenhuma branch foi criada/testada no Supabase** (feature "branching" do MCP) para validar a
   migration de verdade — evitado por causa de possível custo de infraestrutura sem sua aprovação
   explícita. Se você quiser esse nível de verificação antes de aplicar, me avisa.

## Tempo total e tokens gastos (estimativa)

Não meço tempo de relógio nem tokens de forma confiável a partir de dentro da própria sessão —
não vou inventar um número. O que dá pra dizer: foram ~25 consultas SQL read-only ao Cloud
(schema, policies, contagens, amostras), leitura de ~15 arquivos de código/migration, e 7 commits
locais distribuídos em 2 branches.

## Próximo passo sugerido

Nesta ordem, do mais rápido para o mais lento:

1. **Decidir sobre Correção 2** (escopo de acesso do MCP Supabase) — não bloqueia o resto, mas é
   o achado de segurança mais estrutural desta rodada.
2. **Revisar e aprovar (ou pedir mudanças) na migration de `api_keys`** (`fix/rls-api-keys`) —
   quando pronto, a frase literal "aprovado, aplica em prod" libera a aplicação.
3. **Priorizar a ordem de B1/B2/B3/B4** do CRM e escolher a UX do B2 — libera o próximo lote de
   trabalho no ciclo paralelo.
4. **Decidir se quer as duas branches locais pushadas** (o classificador bloqueou minha tentativa)
   — ou revisar puxando este worktree localmente.
5. **Decidir sobre `AUDITORIA-API-KEYS.md`/`SPEC-LOG-DE-ERROS.md`** ainda untracked — commitar
   ou manter como estão.
