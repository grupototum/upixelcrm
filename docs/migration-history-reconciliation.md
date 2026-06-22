# Reconciliação do histórico de migrations (Supabase)

> **Objetivo:** alinhar o histórico de migrations da produção com os arquivos em
> `supabase/migrations/`, para que `supabase db push` volte a funcionar e o CI
> possa aplicar migrations automaticamente (reintroduzir o job `deploy-migrations`
> que foi revertido — ver PRs #29/#30).
>
> **Quem executa:** alguém com **Supabase CLI + acesso ao banco** (senha do
> Postgres do projeto). **Não dá pra fazer só via MCP.**
>
> **Projeto:** `xusdhzwfkzufupjwbebt`

---

## Sintoma

`supabase db push` falha com:

```
Remote migration versions not found in local migrations directory.
Make sure your local git repo is up-to-date. If the error persists, try
repairing the migration history table:
  supabase migration repair --status reverted <versões…>
```

## Causa

O repo tem **83** arquivos em `supabase/migrations/`, mas a tabela de histórico
remota (`supabase_migrations.schema_migrations`) contém **36 versões que não têm
arquivo local correspondente** — migrations aplicadas fora do fluxo do repo (via
MCP `apply_migration`, dashboard ou SQL direto). Como `db push` exige que todo
registro remoto tenha um arquivo local, ele se recusa a rodar.

> ⚠️ `migration repair` **edita apenas a tabela de histórico** — **não** altera
> schema nem dados. O schema da produção já está correto; o problema é só
> "bookkeeping".

### As 36 versões remotas órfãs (do log do CI)

```
20260423220423 20260423220424 20260424202908 20260502181209 20260502181220
20260502182309 20260502204720 20260502204730 20260505140554 20260505140935
20260507195750 20260515202123 20260520155451 20260520155550 20260520155716
20260521124458 20260521131139 20260521163000 20260521184933 20260522201529
20260522202655 20260523035717 20260525124559 20260531145432 20260531145435
20260531145535 20260531145544 20260531145625 20260610121029 20260610121037
20260610121103 20260610121511 20260610121609 20260619215641 20260619215715
20260619215821
```

> As três últimas (`20260619215641/215715/215821`) são as migrations
> `macros`/`csat`/`sdr_route` que apliquei via MCP nesta sessão — o conteúdo já
> está no banco **e** no repo (`20260614100000_macros.sql`,
> `20260617000000_csat.sql`, `20260619120000_sdr_route.sql`), só com timestamp
> de versão diferente.

---

## Pré-requisitos

```bash
# 1) CLI instalada e logada
supabase --version
export SUPABASE_ACCESS_TOKEN=<token>          # ou `supabase login`
export SUPABASE_DB_PASSWORD=<senha-do-postgres>

# 2) Linkar o projeto
supabase link --project-ref xusdhzwfkzufupjwbebt

# 3) BACKUP antes de qualquer coisa (a tabela de histórico e, idealmente, o schema)
supabase db dump --linked -f backup_pre_reconcile_schema.sql
#   (e/ou um snapshot/PITR pelo dashboard)
```

Faça isto numa **janela de manutenção** e com o repo na branch `main` atualizada.

---

## Diagnóstico

```bash
# Mostra lado a lado: Local | Remote | Time
supabase migration list --linked
```

Para cada versão, há 3 casos:

| Caso | Situação | Ação |
|---|---|---|
| A | Versão remota **órfã**, mas o schema que ela criou **já existe** e está coberto por um arquivo local (timestamp diferente) | `repair --status reverted` na versão remota órfã (limpa o registro duplicado) |
| B | Versão remota órfã de algo que **não** tem arquivo local nenhum | Recrie o arquivo local a partir do schema (`db pull`) **ou** aceite a baseline (ver abaixo) |
| C | Arquivo **local** que o remoto não marca como aplicado, mas o objeto já existe | `repair --status applied` na versão local |

Para este projeto, a maioria cai no **caso A** (schema correto; histórico sujo).

---

## Procedimento recomendado (não destrutivo)

> A ideia: fazer a tabela de histórico **concordar** com os arquivos locais, sem
> tocar no schema. Como o schema já reflete tudo, marcamos as versões remotas
> órfãs como `reverted` (some do histórico) e, se necessário, marcamos os
> arquivos locais equivalentes como `applied`.

```bash
# 1) Marca as 36 versões remotas órfãs como revertidas (apaga só o registro)
supabase migration repair --status reverted \
  20260423220423 20260423220424 20260424202908 20260502181209 20260502181220 \
  20260502182309 20260502204720 20260502204730 20260505140554 20260505140935 \
  20260507195750 20260515202123 20260520155451 20260520155550 20260520155716 \
  20260521124458 20260521131139 20260521163000 20260521184933 20260522201529 \
  20260522202655 20260523035717 20260525124559 20260531145432 20260531145435 \
  20260531145535 20260531145544 20260531145625 20260610121029 20260610121037 \
  20260610121103 20260610121511 20260610121609 20260619215641 20260619215715 \
  20260619215821

# 2) Reveja o estado
supabase migration list --linked

# 3) Marque como aplicados os arquivos LOCAIS cujo schema já existe no banco
#    (evita que o próximo `db push` tente recriá-los). Use os timestamps dos
#    nomes de arquivo em supabase/migrations/. Exemplo p/ os desta sessão:
supabase migration repair --status applied \
  20260614100000 20260617000000 20260619120000
#    Repita para quaisquer outros arquivos locais que `migration list` mostrar
#    como "não aplicados" mas cujo objeto já existe.

# 4) Validação: dry-run. NÃO deve querer aplicar nada já existente.
supabase migration list --linked
supabase db push --linked --dry-run
```

As migrations do repo são **idempotentes** (`IF NOT EXISTS`, `CREATE OR REPLACE`,
`DROP POLICY IF EXISTS`, `ALTER PUBLICATION` guardado), então mesmo que o
`db push` re-rode alguma, não quebra.

### Alternativa: adotar uma baseline (se o caso B for grande)

Se houver muitas versões remotas sem arquivo local e não valer recriar uma a
uma:

```bash
supabase db pull --linked            # gera 1 migration com o schema atual completo
# revise o arquivo gerado, comite, e então repair/list até local == remote
```

---

## Verificação final

- `supabase migration list --linked` → colunas Local e Remote **alinhadas**.
- `supabase db push --linked --dry-run` → "Remote database is up to date" (ou
  só aplica o que é genuinamente novo).
- Nenhum erro `Remote migration versions not found…`.

---

## Reativar migrations no CI (depois de reconciliar)

Com o histórico são, dá pra reintroduzir com segurança o que o PR #29 tentou
(e o #30 reverteu):

1. Criar o secret **`SUPABASE_DB_PASSWORD`** no repo (Settings → Secrets and
   variables → Actions). `SUPABASE_ACCESS_TOKEN` já existe.
2. Reaplicar o job `deploy-migrations` no `.github/workflows/deploy.yml`
   (rodando `supabase db push` **antes** de `deploy-functions`/`deploy-vps`,
   ambos dependendo dele com `success || skipped`). O diff exato está no
   histórico do PR #29.
3. Validar primeiro num push de teste que toque só `supabase/migrations/**`.

Assim a inversão que derrubou o `whatsapp-queue-processor` (função nova
filtrando coluna inexistente) não volta a acontecer.
