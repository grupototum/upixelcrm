# PC-040 — Reconciliação de migrations (versão leve)

> Escopo: Correção 0 do batch de 2026-08-21. Só inspeção read-only via MCP Supabase contra
> o Cloud `xusdhzwfkzufupjwbebt` (ver `AMBIENTE-DRYRUN.md`). **Nada foi aplicado.**
> Reconciliação completa das 36 (ver correção do número abaixo) fica em backlog — não é
> feita agora, por decisão do Rael (ver prompt do batch, Ajuste 3).

## Correção sobre o número "36"

`docs/migration-history-reconciliation.md` cita **36 versões remotas órfãs**. Medindo agora
(2026-08-21), `supabase_migrations.schema_migrations` tem **67 versões**, `supabase/migrations/`
tem **115 arquivos** com **89 prefixos de versão únicos** (26 arquivos compartilham data com
outro arquivo do mesmo dia — ver nota no fim). Comparando por prefixo de versão:

| | Contagem |
|---|---|
| Versões no remoto | 67 |
| Versões órfãs (remoto sem arquivo local) | **20** |

O número real hoje é **20, não 36** — a diferença sugere que parte da reconciliação já
aconteceu entre a data daquele doc e hoje (alguém já recuperou/adicionou arquivos locais para
16 das antigas órfãs). Não achei uma migration específica que tenha "fechado" esse gap —
registro aqui como achado, não como explicação completa.

## As 20 órfãs — classificação

| Version | Nome no remoto | Categoria | Nota |
|---|---|---|---|
| `20260729125221` | `restore_user_admin_rpcs` | (a) aplicada em prod, sem arquivo local | Nome sugere RPC de admin de usuário — correlacionar com `admin-create-user` |
| `20260729130016` | `restore_bypass_in_profile_trigger` | (a) | Mexe em trigger de `profiles` — sensível (achado abaixo) |
| `20260729132546` | `revisao_db_cleanup_hardening` | (a) | Nome genérico, pode tocar múltiplas tabelas — não dá pra confirmar escopo sem o SQL original |
| `20260729224813` | `fix_handle_new_user_tenant_id` | (a) | Trigger de criação de usuário — sensível |
| `20260811004344` | `inbox_bot_perf_indexes` | (a) | Índices — baixo risco |
| `20260811004809` | `bot_sessions_single_active` | (a) | Constraint de bot sessions |
| `20260811004948` | `bots_draft_publish` | (a) | Coluna/fluxo de draft-publish de bots |
| `20260811005654` | `saved_views` | (a) | Tabela `saved_views` — já vista no schema atual |
| `20260811105718` | `drop_dead_schema` | (a) | **Atenção:** nome sugere DROP — se essa migration removeu algo, o local repo pode ainda referenciar tabelas/colunas que não existem mais. Candidato a investigar antes de qualquer reconciliação completa. |
| `20260813060202` | `bulk_update_lead_custom_field` | (a) | RPC de bulk update |
| `20260813060739` | `lead_duplicate_exceptions` | (a) | Tabela nova |
| `20260813074617` | `lead_phones` | (a) | Tabela nova |
| `20260813074840` | `lead_contacts` | (a) | Tabela nova |
| `20260813075231` | `lead_standard_fields` | (a) | Colunas padrão de lead |
| `20260813075949` | `goals` | (a) | Tabela `goals` v1 |
| `20260813182525` | `rls_admin_gates` | (a) | **Ver nota de colisão de nome abaixo** |
| `20260813211100` | `goals_v2` | (a) | Superseder de `goals` |
| `20260813211220` | `goals_v2_fix_responsible_id_cast` | (a) | Fix pontual |
| `20260818013230` | `call_attempt_event` | (a) | Recente (feat/metas-v2, PR #86) |
| `20260818013238` | `seed_initial_goals` | (a) | Seed de dados — recente |

**Categoria (b) local nunca aplicada / (c) duplicata-lixo:** nenhuma encontrada nesta passada —
todas as 20 órfãs são categoria (a) (aplicadas em prod, sem arquivo local correspondente).
Isso é consistente com o que `docs/migration-history-reconciliation.md` já apontava: migrations
rodadas via MCP/Dashboard/SQL direto, nunca commitadas como arquivo.

## Nenhuma órfã toca `api_keys` ou `error_logs` diretamente pelo nome

Nenhum dos 20 nomes menciona `api_keys`, `error_logs`, `webhook_endpoints` ou `webhook_deliveries`.
**Isso não é garantia absoluta** — não tenho o SQL de dentro dessas migrations (só existem em
produção, não no repo), então um nome genérico como `revisao_db_cleanup_hardening` ou
`restore_bypass_in_profile_trigger` teoricamente poderia tocar RLS de qualquer tabela, incluindo
`api_keys`. Mas o estado ATUAL medido direto no banco (0 policies em `api_keys`, RLS habilitada)
já é a fonte de verdade que importa para a Correção 1 — independente do que essas migrations
fizeram, o resultado final observável é o que a migration nova precisa corrigir.

**Veredito: Correção 1 liberada.** Nenhum conflito de nome/escopo encontrado que bloqueie a
migration nova de `api_keys`.

## Achado extra — `tags` também está no escopo da checagem, com resultado diferente

A tabela `tags` (relevante para o bug "Gerenciar Tags", ver `TAGS-BUG-DIAGNOSE.md`) **já tem
1 policy ativa e correta** (`tenant_isolation_tags`, escopada por `tenant_id` + `role='master'`).
Não é um caso de RLS ausente como `api_keys` — é outro tipo de bug (schema drift no front).
**Por isso a Correção 1 NÃO deve ser expandida para incluir `tags`** — ver detalhe completo em
`TAGS-BUG-DIAGNOSE.md`. Isso contraria a suposição do prompt original (Correção 1 poderia
"consolidar" com tags se a causa fosse RLS) — aqui não é.

## Achado extra — colisão de nome em `rls_admin_gates`

O repo tem `supabase/migrations/20260813070000_rls_admin_gates.sql` (versão `20260813070000`).
O remoto tem uma versão **diferente**, `20260813182525`, com o **mesmo nome** `rls_admin_gates`
(11h25min depois, mesmo dia). Isso sugere que o script real aplicado em produção para essa
migration pode não ser byte-a-byte igual ao arquivo local — pode ter havido uma segunda tentativa
com timestamp diferente. Não afeta a Correção 1 (que já foi desenhada consultando `pg_policies`
ao vivo, não o arquivo), mas é um sinal de alerta para qualquer reconciliação completa futura:
**não assumir que arquivo local == o que rodou em produção**, mesmo quando os nomes batem.

## Achado extra — duplicidade de data em nomes de arquivo local

26 dos 115 arquivos locais compartilham a mesma data (sem horário) com outro arquivo do mesmo dia
(ex.: 9 arquivos com prefixo `20260428`, sem componente de hora). Isso não quebra nada sozinho
(Supabase usa o nome completo do arquivo, não só o prefixo numérico, para computar hash/ordem em
alguns fluxos), mas dificulta auditoria e pode gerar comportamento inesperado dependendo da versão
da CLI. Fora de escopo desta correção — registrado como item de higiene para o backlog.

## Reconciliação completa — backlog, não executada agora

Por decisão do Rael (Ajuste 3), a reconciliação completa das 20 órfãs (recuperar o SQL real de
produção via `pg_dump`/introspection, escrever os arquivos locais correspondentes, rodar
`supabase migration repair`) fica para uma sprint separada. Ordem sugerida quando for feita:

1. `20260811105718 drop_dead_schema` primeiro — entender o que foi dropado antes de tocar
   qualquer outra coisa, para não reintroduzir uma tabela/coluna morta por engano.
2. `restore_bypass_in_profile_trigger` e `fix_handle_new_user_tenant_id` — ambas tocam o
   trigger de criação de usuário, área sensível (`auth`-adjacent). Fazer juntas, com atenção.
3. As 5 de `lead_*`/`goals*`/`call_attempt_event`/`seed_initial_goals` — já usadas por features
   ativas (metas v2, PR #86), risco menor de reconciliar por último.
4. Precedente de nomenclatura a seguir: `supabase/migrations/9999_reconcile_drift.sql` já
   estabelece o padrão `9999_...` para migrations de reconciliação (fora da sequência de
   timestamp, propositalmente, para rodar por último).

**Riscos de cada movimento:** todos exigem confirmar que o SQL recuperado é idempotente
(`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) antes de commitar como arquivo —
do contrário, ao rodar `supabase db push` num ambiente novo (ex.: preview branch), o arquivo
tentaria recriar algo que já existe e falharia.
