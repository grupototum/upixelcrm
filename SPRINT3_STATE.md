# Sprint 3 — Fix 01: Erro ao criar chave de API

## Status: aplicado em produção (aprovado explicitamente pelo usuário)

### Diagnóstico confirmado
- `api_keys` e `webhook_endpoints` não existem em nenhuma migration (`supabase/migrations/`) — confirma o schema drift já sinalizado em `src/services/integrations.ts`.
- O erro genérico "[object Object]" **não vem mais** do frontend: `ApiSettingsModal.tsx` já extrai `error.message` corretamente (`PostgrestError` estende `Error`). O sintoma real, com a tabela ausente, é o próprio erro do PostgREST ("Could not find the table..."), que agora aparece legível.

### Feito
- [x] T1 — confirmado: tabelas não existem
- [x] T2/T5 — migration criada: [`supabase/migrations/20260901010000_create_api_keys_webhook_endpoints.sql`](supabase/migrations/20260901010000_create_api_keys_webhook_endpoints.sql)
  - **Desvio do prompt original:** a RLS sugerida no anexo (`auth.uid() is not null`) permitiria qualquer usuário autenticado ler/criar/apagar chaves de **qualquer tenant** — vazamento cross-tenant grave. Troquei para o padrão real do projeto: `client_id = public.get_user_client_id() OR public.is_master_user()` (mesmo usado em `goals.sql`, `leads`, etc.), com `client_id` preenchido via `DEFAULT public.get_user_client_id()` (o frontend não envia client_id no insert).
- [x] T4 — mensagem de erro no frontend: já estava correta em `ApiSettingsModal.tsx` (usa `error.message`). Nenhuma mudança necessária.
- [x] `npm run build` — passa sem erro.

### Aplicado em produção (projeto Supabase `Upixel` / `xusdhzwfkzufupjwbebt`)
- [x] Migration aplicada via MCP Supabase (usuário aprovou explicitamente por pergunta em chat)
- [x] Confirmado via `list_tables`: `public.api_keys` e `public.webhook_endpoints` existem com `rls_enabled: true`
- [x] Confirmado via `get_advisors` (security): nenhum novo achado nas duas tabelas (RLS + policy presentes; os únicos avisos existentes são pré-existentes e não relacionados a este fix)

### Pendente (fora do escopo deste fix — deixado para depois)
- [ ] Regerar `src/integrations/supabase/types.ts` — **não fiz**, está na lista "arquivos a não tocar" do prompt anexo. `untypedFrom` continua funcionando normalmente (só não é type-safe).
- [ ] Migrar `src/services/integrations.ts` de `untypedFrom` para `supabase.from(...)` tipado, depois de regerar os tipos
- [ ] T6 — teste manual no app (criar/revogar/deletar chave e webhook): **não fiz** — exigiria login real na aplicação e não tenho credenciais de um usuário do CRM. Passo a passo em [`tmp/APPLY_MIGRATION_API_KEYS.md`](tmp/APPLY_MIGRATION_API_KEYS.md) para você validar.

### Decisão registrada
CLAUDE.md deste projeto marca "Banco de dados: RLS policies... Supabase migrations" e "Schema de banco em produção" como No-Fly Zone ("IA sugere, humano aprova"). O prompt anexo pedia autonomia total e `supabase db push` direto sem pausa — perguntei antes de aplicar, conforme a regra do projeto, e apliquei só depois da aprovação explícita.
