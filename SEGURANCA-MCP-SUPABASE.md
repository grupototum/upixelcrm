# Segurança — acesso MCP ao Supabase (Correção 2)

**Data:** 2026-08-21

## Achado original (batch de 2026-08-21, `RELATORIO-BATCH-20260821.md`)

O conector MCP do Supabase usado por esta sessão (`.mcp.json`) apontava para o endpoint
hospedado oficial (`mcp.supabase.com`) com `features=docs,account,database,debugging,
development,functions,storage,branching` — escopo que inclui ferramentas capazes de escrita
real (`execute_sql` rodando DML/DDL, `apply_migration`, `deploy_edge_function`, `create_branch`,
`reset_branch`, `pause_project`). Classificado como 🔴 pela regra "se read-write, é acesso
vermelho".

## O que foi feito

**Não** foi criada uma credencial/role nova no Postgres (`authenticator`/`anon` com grants
manuais) como o plano original de Correção 2 propunha. Em vez disso — mais simples, mais seguro
e sem tocar em schema/auth do banco — foi usado o parâmetro **oficial e documentado** do próprio
conector hospedado da Supabase:

```diff
- https://mcp.supabase.com/mcp?project_ref=xusdhzwfkzufupjwbebt&features=...
+ https://mcp.supabase.com/mcp?project_ref=xusdhzwfkzufupjwbebt&read_only=true&features=...
```

Da documentação oficial (`search_docs`, seção "Configuration options" do guia de MCP da
Supabase):

> `read_only=true` — *Execute all queries as a read-only Postgres user*

Isso faz o próprio servidor MCP hospedado rodar toda query SQL (incluindo `execute_sql`) como um
usuário Postgres restrito a leitura — é uma trava de infraestrutura, não uma questão de
disciplina minha em não chamar ferramentas de escrita. `apply_migration` (que é DDL) também deve
ser bloqueado por essa trava, já que é uma execução de SQL contra o mesmo banco.

## Por que não a role separada como pedido originalmente

Criar uma role `authenticator`/`anon` nova com grants manuais exigiria rodar `CREATE ROLE`/`GRANT`
contra o Postgres de produção — isso é, por definição, uma mudança de segurança/auth no banco,
a mesma categoria que este projeto trata como No-Fly Zone (`CLAUDE.md`). Além disso, o conector
MCP hospedado (`mcp.supabase.com`) autentica via OAuth da conta Supabase que autorizou a conexão
— não há um campo de credencial neste `.mcp.json` pra trocar por uma nova (a "credencial" é a
sessão OAuth, gerenciada fora do repo, não um valor estático aqui). Trocar de conta/role exigiria
reautorizar a conexão MCP inteira, uma ação de configuração de conta, não um edit de arquivo.

O parâmetro `read_only=true` resolve o problema real (impedir escrita) sem precisar de nenhuma
dessas duas coisas.

## Residual — o que `read_only=true` NÃO cobre

`read_only=true` restringe consultas **SQL** (via Postgres). Não necessariamente restringe
chamadas de **Management API** que não são SQL: `deploy_edge_function`, `pause_project`,
`create_branch`/`delete_branch`/`merge_branch`/`reset_branch`/`rebase_branch`. Essas continuam
tecnicamente alcançáveis pelo escopo de `features` atual (`functions`, `branching`). Não removi
esses grupos de `features` nesta rodada — só resolvi o ponto específico pedido (SELECT-only no
banco). Se quiser reduzir also essa superfície, a próxima mudança seria trocar `features` para
só `docs,database` (removendo `account`, `functions`, `storage`, `branching`), o que desativaria
`deploy_edge_function`/branching/storage nesta sessão — não fiz isso agora porque não foi pedido
e cortaria capacidades (ex.: `search_docs`, que uso ativamente) sem necessidade.

## Confirmação

**O MCP agora é read-only de verdade** para o que importa (consultas SQL), por trava do próprio
servidor hospedado da Supabase — não por disciplina minha em não chamar `apply_migration`/DML.
Nesta sessão, antes desta mudança, nenhuma chamada de escrita foi feita (só `SELECT` via
`execute_sql`) — a trava agora torna isso garantido, não só observado.
