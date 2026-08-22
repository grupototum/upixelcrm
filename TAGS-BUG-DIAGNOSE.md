# TAGS-BUG-DIAGNOSE.md — Bug "Gerenciar Tags"

> Última revisão: 2026-08-21 por Claude Code (post-merge PRs #93/#94/#95).
> Versão anterior arquivada em `docs/history/`.

## ✅ RESOLVIDO — desfecho (2026-08-21)

**Diagnóstico confirmado. Caminho 1 aplicado.** Corrigido em `9557648`
`[fix-tags-schema-drift]`, já em `main`.

**Confirmação do drift:** `client_id` vs `tenant_id` **confirmado via
`src/integrations/supabase/types.ts:2486`** — arquivo gerado a partir do schema
real do banco, que declara `tenant_id NOT NULL` e nenhuma coluna `client_id`.
**A contagem por prod (seção 7) não foi executada: MCP do Supabase indisponível
nesta sessão.** O `types.ts` foi tratado como fonte confiável o suficiente para
o fix, por decisão do Rael.

**O que mudou de fato:** o problema não era só o `useTags`. O
`src/services/leads.ts` **já tinha** o repo de tags corrigido para `tenant_id`,
mas o hook nunca foi migrado e continuava chamando
`untypedFrom("tags").eq("client_id", …)` direto, contornando o repo já
consertado. O fix roteia as 4 operações pelo repo e troca
`tenant?.id ?? user?.client_id` por `resolveClientId` + guard `isValidUuid`.

**Sobre o palpite de RLS:** descartado, como a seção 2 previa. A policy
`"Tenant isolation on tags"` libera master via `is_master_user()`. **Nenhuma
mudança de RLS foi feita, e o fix não foi consolidado com a Correção 1 do ciclo
`api_keys`** — causas diferentes.

**Bugs 3 e 4 desta análise:**
- Seção 5 (cliente tipado vs untyped na mesma tabela) — ✅ resolvido junto.
- Seção 6 (`addGlobalTag` não persiste) — ❌ **AINDA ABERTO**. O mock segue em
  `AppContext.tsx:111` e o `AddTagModal` continua sugerindo 5 strings falsas em
  vez das tags reais do tenant. Aguarda decisão. Ver
  `RELATORIO-CRM-BATCH-20260821.md`.

O corpo abaixo é o diagnóstico original, preservado sem edição — as seções 7 e 8
(query pendente e escolha de caminho) já foram resolvidas por este bloco.

---


**Data:** 2026-08-21
**Bloco:** D (investigação) / A5
**Status:** diagnóstico concluído — **aguarda confirmação em prod** (1 query) antes de escolher o caminho de fix.

---

## TL;DR

**O palpite de RLS está errado.** A policy de `tags` já cobre master.
A causa raiz mais provável é **schema drift real**: o código consulta `tags.client_id`,
mas os tipos gerados a partir do banco de produção dizem que **essa coluna não existe** —
a tabela em prod tem `tenant_id NOT NULL` e nenhum `client_id`.

Se confirmado, o erro é `42703 column tags.client_id does not exist`, e ele dispara
**no load da tela `/crm`**, não só no modal — o que casa exatamente com o relato do Rael
("quando estou na tela de leads dá erro").

**Fix, se confirmado: 🟢 frontend puro em `useTags.ts`. Nenhuma migration. Não consolida com a Correção 1 do outro ciclo.**

---

## 1. Onde o erro dispara (mapa de gatilhos)

`useTags()` é chamado em **dois lugares**, não um:

| Arquivo | Linha | Quando dispara |
|---|---|---|
| [CRMPage.tsx:175](src/pages/CRMPage.tsx:175) | `const { tags: tagMetas } = useTags();` | **no load da tela `/crm`** — antes de qualquer clique |
| [TagsManager.tsx:30](src/components/crm/TagsManager.tsx:30) | `useTags()` | ao abrir o Dialog "Gerenciar Tags" |

`TagsManager` só é montado em [LeadProfilePage.tsx:538](src/pages/LeadProfilePage.tsx:538) — não há outro uso.

`useTags` roda `fetchTags()` num `useEffect` no mount ([useTags.ts:36-38](src/hooks/useTags.ts:36)).
Portanto o toast `"Erro ao carregar etiquetas. Tente novamente."` ([useTags.ts:29](src/hooks/useTags.ts:29))
aparece **duas vezes**: uma ao entrar em `/crm`, outra ao abrir o modal.

> Isso já responde a pergunta do A5 ("erro ao abrir o modal, ao listar, ou ao criar?"):
> **ao listar** — e o listar acontece no mount, tanto da página quanto do modal.

---

## 2. Por que NÃO é o mesmo bug de RLS do `api_keys`

Policy atual de `tags` ([20260424_automation_and_crm_tables.sql:65-74](supabase/migrations/20260424_automation_and_crm_tables.sql:65)):

```sql
CREATE POLICY "Tenant isolation on tags"
  ON public.tags FOR ALL TO authenticated
  USING     (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK(client_id = public.get_user_client_id() OR public.is_master_user());
```

E `is_master_user()` na versão vigente ([m55_fix_rls_n1_profiles_cache.sql:120](supabase/migrations/20250602180000_m55_fix_rls_n1_profiles_cache.sql:120)):

```sql
SELECT COALESCE(public.get_cached_profile_field('role'), '') = 'master'
```

Ou seja: **master passa**. Não existe `role = 'supervisor'` literal nessa policy.
Se fosse RLS, o master não veria erro nenhum — ele é explicitamente liberado.

**Descartado.** Não agrupar com a Correção 1 do outro ciclo.

---

## 3. Causa raiz provável — schema drift em `tags`

Duas definições conflitantes da mesma tabela:

### 3.1 O que a migration diz

[supabase/migrations/20260424_automation_and_crm_tables.sql:48-58](supabase/migrations/20260424_automation_and_crm_tables.sql:48)

```sql
CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  TEXT NOT NULL,                                   -- ← existe
  tenant_id  UUID REFERENCES public.tenants(id),              -- ← nullable
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  category   TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
```

### 3.2 O que o banco de produção diz

[src/integrations/supabase/types.ts:2486-2509](src/integrations/supabase/types.ts:2486) — arquivo **gerado a partir do banco real**:

```ts
tags: {
  Row: {
    category: string | null
    color: string
    created_at: string | null
    id: string
    name: string
    tenant_id: string        // ← NOT NULL
  }
  // sem client_id. sem updated_at.
}
```

### 3.3 A conclusão

`CREATE TABLE IF NOT EXISTS` é **no-op quando a tabela já existe**. A tabela `tags`
já existia em prod com o shape antigo (`tenant_id`, sem `client_id`), então a migration
de 2026-04-24 **nunca criou nada** — ela só rodou os `CREATE INDEX ... IF NOT EXISTS`
(que teriam falhado em `client_id`… a menos que a migration nunca tenha sido aplicada em prod).

Em qualquer dos dois cenários, o resultado prático é o mesmo: **`tags.client_id` não existe em prod**.

### 3.4 O que o código faz com isso

[useTags.ts:22-25](src/hooks/useTags.ts:22):
```ts
const { data, error } = await untypedFrom("tags")
  .select("*")
  .eq("client_id", clientId)        // ← coluna inexistente → PostgREST 42703
```

O comentário na linha 21 (`"tags.client_id existe no banco mas não nos tipos gerados (schema drift)"`)
**inverte o diagnóstico**: quem foi gerado a partir do banco é o `types.ts`. O comentário está errado —
e `untypedFrom` foi usado justamente para silenciar o TypeScript que estava certo.

Erro esperado no console/toast:
```
column tags.client_id does not exist   (code: 42703)
```

---

## 4. Bug secundário confirmado (independente do drift)

Mesmo que `client_id` existisse, `useTags` resolve o clientId errado para master:

```ts
// useTags.ts:16
const clientId = tenant?.id ?? user?.client_id;
```

No subdomínio master, [TenantContext.tsx:37](src/contexts/TenantContext.tsx:37) seta
`tenant.id = "master"` — uma **sentinela literal, não UUID**. Logo o master consulta
`WHERE client_id = 'master'` → lista vazia, e cria tags órfãs sob um "cliente" que não existe.

O projeto já tem o helper que resolve isso — [`resolveClientId()`](src/lib/tenant-utils.ts:47) —
e 20 arquivos já migraram (`useCustomFields`, `useLeadPhones`, `useGoals`, `useInbox`, …).
`useTags` ficou para trás.

**Outros arquivos ainda no padrão cru** (fora do escopo deste ciclo, mas mesmo risco):

```
src/contexts/AppContext.tsx (9 ocorrências)
src/components/inbox/SlashCommandPicker.tsx:41
src/components/intelligence/AgentsTab.tsx:78
src/components/intelligence/AIProviderSettings.tsx:52
src/components/intelligence/KnowledgeBaseTab.tsx:43
src/components/automations/InstagramFunnelsTab.tsx:93
src/components/whatsapp/broadcast/BroadcastConfigModal.tsx:60
src/hooks/useGoogleAds.ts:17
src/hooks/useMetaAds.ts:42
src/hooks/useBroadcast.ts:85
```

---

## 5. Bug terciário — cliente tipado vs untyped na mesma tabela

`useTags` mistura os dois clientes na mesma tabela:

| Operação | Cliente | Linha |
|---|---|---|
| `fetchTags` | `untypedFrom("tags")` | [22](src/hooks/useTags.ts:22) |
| `createTag` | `untypedFrom("tags")` | [43](src/hooks/useTags.ts:43) |
| `updateTag` | `supabase.from("tags")` (tipado) | [70](src/hooks/useTags.ts:70) |
| `deleteTag` | `supabase.from("tags")` (tipado) | [88](src/hooks/useTags.ts:88) |

`updateTag`/`deleteTag` funcionam (não tocam `client_id`), enquanto `fetch`/`create` quebram.
Sintoma para o usuário: **a lista não carrega, criar falha, mas editar/excluir "funcionaria"** —
exceto que não há nada listado para editar.

---

## 6. Bug quarto — `addGlobalTag` não persiste nada

[AppContext.tsx:944-953](src/contexts/AppContext.tsx:944):

```ts
const addGlobalTag = useCallback(async (tag: string) => {
  if (!tag.trim() || globalTags.includes(tag.trim())) return;
  setGlobalTags(prev => [...prev, tag.trim()]);
  toast.success("Tag criada globalmente");      // ← mentira: só state em memória
}, [globalTags]);
```

`CreateTagModal` chama isso. A tag some no F5. Nenhum insert acontece.
Marcado como **candidato a fix**, não corrigido nesta auditoria.

---

## 7. O que falta para fechar o diagnóstico

Uma query, em prod (leitura pura, sem mutação):

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tags'
ORDER BY ordinal_position;
```

E, para confirmar o sintoma pelo lado do usuário: abrir `/crm` logado como master,
console aberto, e verificar se aparece `42703 column tags.client_id does not exist`.

> **Nota:** o MCP do Supabase não está autenticado nesta sessão, então não consegui rodar
> a query daqui. Precisa ser executada por você ou autorizada via `/mcp` numa sessão interativa.

---

## 8. Caminhos de fix (aguarda decisão do Rael)

### Caminho 1 — prod tem só `tenant_id` (cenário provável) → **🟢 frontend puro**

Reescrever `useTags.ts` para falar `tenant_id` em vez de `client_id`, usando o UUID real
do tenant (nunca a sentinela `"master"`), e trocar `untypedFrom` pelo cliente tipado nas 4 operações.

- Sem migration. Sem tocar RLS.
- ⚠️ Caveat: como `tenant_id` é `NOT NULL` e master não tem tenant real, o master
  **não consegue criar tag sem escolher um tenant**. Precisa decidir o comportamento:
  esconder o botão "Nova Tag" para master sem tenant, ou exigir seleção de tenant. **Decisão sua.**
- 1 commit: `[tags-bug] fix useTags to use tenant_id + resolveClientId`

### Caminho 2 — prod tem `client_id` (migration foi aplicada) → **🟢 frontend puro, menor**

Só trocar linha 16 por `resolveClientId(tenant?.id, user?.client_id)` e regenerar `types.ts`.

- 1 commit: `[tags-bug] use resolveClientId in useTags`

### Caminho 3 — 🟠 alinhar schema (só se você quiser `client_id` de volta)

Migration adicionando `client_id` + backfill a partir de `tenant_id`. **Não recomendo** —
o resto do sistema já convive bem com `tenant_id`, e isso é schema change em produção.

---

## 9. Recomendação

1. Rodar a query da seção 7.
2. Se voltar sem `client_id` → **Caminho 1**, e me diga o comportamento desejado para master.
3. **Não consolidar com a Correção 1 (RLS `api_keys`) do outro ciclo** — causas diferentes,
   e juntar as duas coisas numa migration só criaria acoplamento sem ganho.

**Stop-point. Aguardo sua escolha.**
