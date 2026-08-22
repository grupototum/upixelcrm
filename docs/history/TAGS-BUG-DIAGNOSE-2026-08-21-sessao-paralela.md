# Diagnóstico — bug "Gerenciar Tags"

> Bloco D do prompt `revisao-crm-e-tags.md`. Só leitura + consultas read-only ao banco (Cloud
> `xusdh`, via MCP). Nenhum código foi alterado. **Não é o mesmo bug de RLS que `api_keys`.**

## As 3 hipóteses, testadas

### Hipótese 1 — RLS igual `api_keys` (policy exige role literal, bloqueia master)

**Descartada.** Medido direto no banco:

```sql
select c.relrowsecurity, count(*) from pg_policies p, pg_class c
where c.relname='tags' and p.tablename='tags';
-- relrowsecurity: true, policies: 1
```

```sql
select policyname, cmd, roles, qual from pg_policies where tablename='tags';
-- tenant_isolation_tags | ALL | {public} |
--   (tenant_id = (select profiles.tenant_id from profiles where profiles.id = (select auth.uid())))
--   OR (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'master'))
```

A policy existe, está ativa, e **já cobre master explicitamente** (`OR ... role = 'master'`) —
ao contrário de `api_keys`, que tinha zero policies. Não é o mesmo bug.

### Hipótese 2 — `clientId` undefined no frontend

**Descartada como causa principal**, mas o código tem um sintoma relacionado (ver Hipótese 3).
`src/hooks/useTags.ts:16`: `const clientId = tenant?.id ?? user?.client_id;` — mesmo padrão de
fallback já sinalizado como armadilha em `src/lib/tenant-utils.ts` (auditoria anterior, achado
sobre `resolveClientId`), mas isso por si só não causaria o erro relatado — o valor resultante
não é `undefined` na prática (sempre há `tenant.id` ou `user.client_id` disponível quando a
página carrega).

### Hipótese 3 — Schema drift (`client_id` vs `tenant_id`) — **CONFIRMADA, é esta**

Medido direto no banco:

```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='tags' order by ordinal_position;
-- id | tenant_id | name | color | category | created_at
```

**A tabela `tags` não tem coluna `client_id`. Nunca teve — a coluna real é `tenant_id`
(uuid, not null).** O código em `src/hooks/useTags.ts` consulta e insere usando `client_id`:

```ts
// fetchTags (linha ~22)
const { data, error } = await untypedFrom("tags")
  .select("*")
  .eq("client_id", clientId)   // ← coluna não existe
  .order("name", { ascending: true });

// createTag (linha ~40)
const { data, error } = await untypedFrom("tags")
  .insert({
    client_id: clientId,        // ← coluna não existe
    name: params.name,
    ...
  })
```

O comentário no próprio arquivo (`useTags.ts:20`) diz *"tags.client_id existe no banco mas não
nos tipos gerados (schema drift)"* — **esse comentário está errado**. `client_id` não existe no
banco; os tipos gerados (`types.ts`) já estavam certos ao não ter essa coluna. Foi o código que
assumiu o nome errado e usou `untypedFrom` para contornar o erro de tipo, mascarando o problema
real em vez de expor.

**Confirma exatamente o sintoma reportado:** os 8+ registros repetidos de hoje em `error_logs`
(ver `ERROR-LOGS-INSPECAO.md`) são todos:

```
Error fetching tags: {"code":"42703","message":"column tags.client_id does not exist"}
```

`42703` é "coluna não existe" — não `42501` (RLS). O toast que o usuário vê é
`"Erro ao carregar etiquetas. Tente novamente."` (genérico, `useTags.ts` linha ~28) — diferente
do toast de `createTag`/`updateTag`/`deleteTag`, que já expõem `error.message` (linhas 55-58,
76, 94, como o prompt original já observava) — então se o usuário tentasse **criar** uma tag em
vez de só listar, veria a mensagem `42703` completa. O sintoma "dá erro ao gerenciar tags" bate
com o `fetchTags` falhando ao abrir o modal (a lista nunca carrega).

## `updateTag`/`deleteTag` não são afetados

Só `fetchTags` (SELECT) e `createTag` (INSERT) referenciam `client_id` diretamente.
`updateTag`/`deleteTag` usam o client **tipado** (`supabase.from("tags")`, não `untypedFrom`) e
filtram só por `id` — não tocam a coluna problemática. A RLS (`tenant_isolation_tags`) continua
protegendo essas duas operações normalmente, então elas devem funcionar hoje sem erro.

## Onde `TagsManager` é acionado

`src/components/crm/TagsManager.tsx` é renderizado **só** em
`src/pages/LeadProfilePage.tsx:538`, dentro do modal "Gerenciador de Tags". Não há segundo ponto
de entrada em `src/`. O relato do Rael ("quando estou na tela de leads dá erro") é coerente com
isso — o caminho é: `/crm` → clique num card → `LeadProfilePage` → botão "Gerenciar Tags" →
`TagsManager` → `useTags()` → `fetchTags()` falha.

## Caminho recomendado (Bloco D)

**Não é RLS. Não consolidar com a Correção 1 de `api_keys`.** É fix 🟢 frontend puro, isolado,
em `src/hooks/useTags.ts`: trocar `client_id` por `tenant_id` (e usar `tenant?.id` diretamente
em vez do fallback `tenant?.id ?? user?.client_id`, já que a coluna real é `tenant_id` — um
`client_id` de usuário master não teria o mesmo significado). Não implementado nesta rodada —
**stop-point deste bloco**: aguarda Rael aprovar o caminho (confirmado aqui como "fix separado",
não "consolidar RLS", mas a decisão final de quando implementar é do Rael).
