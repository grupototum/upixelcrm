# Inspeção de `error_logs` — antes de estender

> Escopo: Correção 3 do batch de 2026-08-21. Só leitura. Confirma que a decisão de estender
> `error_logs` (em vez de criar `error_log` do zero, `SPEC-LOG-DE-ERROS.md`) não quebra nada
> do que já grava lá hoje.

## Schema atual (medido em produção, `xusdhzwfkzufupjwbebt`)

| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | não | `gen_random_uuid()` |
| `client_id` | text | sim | — |
| `user_id` | uuid | sim | — (FK implícita para `auth.users`, não verificada nesta rodada) |
| `message` | text | não | — |
| `context` | jsonb | não | `'{}'::jsonb` |
| `created_at` | timestamptz | não | `now()` |

**Não existe migration desta tabela no repo** — confirmado por grep completo em
`supabase/migrations/*.sql` (115 arquivos, zero menções a `error_logs`). A tabela só existe em
produção, criada fora do fluxo do repo — mesma classe de problema do PC-040.

## RLS e policies (medido, não hipotético)

RLS **habilitado**. **2 policies**, ambas em `{public}` (não `{authenticated}`):

| Policy | Comando | Roles | Condição |
|---|---|---|---|
| `Master read error_logs` | SELECT | `{public}` | `(select is_master_user())` |
| `Service role insert error_logs` | INSERT | `{public}` | `with_check: true` |

**Achado que já estava na auditoria original (A-06), reconfirmado agora:** o INSERT está aberto
para `{public}` com `with_check true` — **qualquer requisição, autenticada ou não, pode gravar
na tabela.** Não é hipótese, é o que está lá agora.

## Quem escreve / quem lê hoje

- **Escreve:** só `src/lib/logger.ts` (`logger.error()`, chamado em ~103 lugares de `src/`), e só
  em produção (`import.meta.env.DEV` pula o insert, vai só pro console).
- **database-backup**: `supabase/functions/database-backup/index.ts` inclui `"error_logs"` na
  lista `CLIENT_TABLES` do dump — é leitura, mas só como parte de backup completo, não uma UI.
- **Nenhuma UI lê a tabela.** Confirmado por grep em `src/` — zero `useQuery`/`select` apontando
  pra `error_logs` fora do backup.

## Padrão de uso atual — 100% das linhas têm o mesmo shape

```sql
select count(*) filter (where client_id is null) as client_id_null,
       count(*) filter (where user_id is null) as user_id_null,
       count(*) filter (where context = '{}'::jsonb) as context_empty,
       count(*) as total
from public.error_logs;
-- resultado: client_id_null=1031, user_id_null=1031, context_empty=1031, total=1031
```

**100% das 1031 linhas têm `client_id` nulo, `user_id` nulo e `context` vazio.** `logger.ts`
grava literalmente só a string de `message` — as outras 3 colunas nunca foram preenchidas por
ninguém, desde a primeira linha (`created_at` mais antigo: 2026-05-07) até a mais recente
(2026-08-21 19:14, hoje). Isso é consistente com o código atual de `sendError()`:

```ts
function sendError(args: any[]) {
  try {
    const message = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    supabase.from("error_logs").insert({ message }).then(() => {});
  } catch { /* noop */ }
}
```

## Amostra sanitizada (nenhum dado bate a regex de segredo — nada foi omitido por sensibilidade)

```
2026-08-21 14:28:52  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 14:23:47  {"code":"42501","message":"new row violates row-level security policy for table \"api_keys\""}
2026-08-21 13:57:02  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 13:55:29  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 13:53:54  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 13:47:43  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 13:45:38  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
2026-08-21 13:45:13  Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
```

O bug de `tags` (diagnosticado em `TAGS-BUG-DIAGNOSE.md`) está disparando repetidamente — cada
carregamento da tela que chama `useTags()` gera uma linha nova. Em volume, é a maior fonte de
ruído na tabela hoje.

## A extensão proposta na spec é aditiva ou conflita?

**Aditiva pura, sem conflito.** Todas as colunas novas propostas em `SPEC-LOG-DE-ERROS.md`
(`tenant_id`, `severity`, `where_source`, `where_backend`, `what_action`, `error_code`, `stack`,
`user_agent`, `route`) são `ADD COLUMN IF NOT EXISTS`, nenhuma toca as 6 colunas existentes, e
`message`/`context` são reaproveitadas (não renomeadas) — as 1031 linhas atuais continuam
válidas, só ficam com as colunas novas em branco (`tenant_id null` = "anterior à instrumentação",
como a spec já previa).

**Ponto que precisa de atenção na Fase 1 da spec, não achado agora:** a policy de INSERT
`{public}` aberta precisa ser fechada (a spec já propõe isso) — mas como o volume atual já é
alto (1031 linhas em ~3.5 meses, boa parte só do bug de `tags` de hoje), vale considerar
retenção/paginação antes de escalar a cobertura (Fase 4 da spec já registra esse risco).

## Recomendação

**Manter a extensão de `error_logs`** (decisão do Rael já confirmada). Nenhuma razão técnica
encontrada para criar tabela nova — a única ressalva é fechar a policy de INSERT aberta o quanto
antes, já que qualquer requisição não-autenticada pode gravar hoje.
