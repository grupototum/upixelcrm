# 🧹 Relatório de Clean Up — uPixel CRM

**Data:** 2026-06-10
**Auditor:** Raio-X Pré-Produção (Vibe Coding Totum v3.0)
**Versão do app:** 1.1.9
**Projeto Supabase:** `Upixel` (`xusdhzwfkzufupjwbebt`, região us-east-1)
**Escopo:** Auditoria de 24 itens em 4 eixos — Segurança, Performance, Arquitetura, Qualidade.

> **Nota metodológica:** os achados de RLS foram **validados contra o banco de produção real**
> (não apenas contra os arquivos de migration), porque o repositório contém migrations legadas
> que foram sobrescritas. Onde o estado de produção difere do código, o estado de produção prevalece.

---

## 🔴 CRÍTICO (impede deploy)

| # | Item | Status | Ação requerida | Evidência |
|---|------|--------|----------------|-----------|
| 1 | **`.env.production` versionado no Git** | ❌ | Remover do tracking, adicionar ao `.gitignore`, **rotacionar** a anon key Supabase + Meta App IDs, e limpar do histórico (3 commits). | `git ls-files` mostra `.env.production` rastreado; `.gitignore` lista só `.env`/`.env.migration`/`.env.local`/`.env.debug` — não cobre `.env.production` |
| 2 | **TypeScript strict desativado** | ❌ | Ativar `strict: true` (e `noImplicitAny`) em `tsconfig.app.json` e corrigir os erros incrementalmente. Contradiz o que o `CLAUDE.md` afirma ("strict mode ativo"). | `tsconfig.app.json`: `strict: false`, `noImplicitAny: false`. 124× `: any` + 97× `as any` em `src/` |
| 3 | **Erros silenciosos na UI** | ❌ | Substituir `console.error`/log mudo por `toast.error` nos hooks de dados; envolver rotas com o `ErrorBoundary` existente. | `useCannedResponses.ts:43`, `useTags.ts:25`, `useSequences.ts:56`, `useInbox.ts:99` retornam sem feedback. `ErrorBoundary.tsx` existe mas não envolve as rotas em `App.tsx` |
| 4 | **QueryClient sem defaults (retry/cache)** | ❌ | Criar `src/lib/queryClient.ts` com `defaultOptions` (`staleTime`, `gcTime`, `retry`, `retryDelay`). Sem isso não há retry automático em falha de rede. | `App.tsx:70` → `new QueryClient()` sem config; `gcTime` nunca definido no codebase |

---

## 🟠 ALTO (corrigir antes de escalar)

| # | Item | Status | Ação requerida | Evidência |
|---|------|--------|----------------|-----------|
| 5 | Vulnerabilidade de dependência | ⚠️ | `npm audit fix` → `react-router` 6.30.3 → 6.31+ (open redirect, GHSA-2j2x-hqr9-3h42, moderate). | `npm audit --omit=dev`: 2 moderate |
| 6 | Funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` | ⚠️ | Revisar `EXECUTE` das 16 funções `SECURITY DEFINER` expostas via PostgREST; revogar das que são internas (triggers como `handle_new_user`, `fn_lead_field_changed`, `enforce_profile_immutable_fields` não deveriam ser RPC-callable). | Supabase advisor (security): lints `0028`/`0029` |
| 7 | Validação de upload só no frontend | ⚠️ | Re-validar MIME/magic-bytes no backend (edge function) + storage policy com whitelist. | `KnowledgeBaseTab.tsx:69-88` valida só client-side |
| 8 | Bucket público `whatsapp_media` permite listagem | ⚠️ | Restringir a policy SELECT broad em `storage.objects` (acesso por URL não precisa de listagem). | Advisor lint `0025` |
| 9 | RBAC: checagens cross-org sem validar `tenant_id` | ⚠️ | Em `owner_add_org_member`/`supervisor_set_role`, validar `tenant_id` além de `organization_id`. (RLS de dados está OK — ver item OK-1.) | migration `20260407200548_...sql:81-127` |
| 10 | `select("*")` + sem índices `(client_id, created_at)` | ⚠️ | Selecionar colunas explícitas em `AppContext.tsx`; criar índices compostos em `tasks`/`timeline_events`. | `AppContext.tsx:133-135,214`; 26 FKs sem índice (advisor perf) |
| 11 | Cobertura de testes ~5% | ⚠️ | Suite E2E Playwright (login, isolamento de tenant, inbox) + unit de auth/tenant. Playwright config está vazio. | Só 4 testes em `src/test/`; `playwright.config.ts` é wrapper vazio |
| 12 | RLS multi-permissive degrada performance | ⚠️ | Consolidar políticas sobrepostas (`Tenant isolation` + `Users can ...`) e usar `(select auth.uid())` para evitar re-avaliação por linha. | Advisor perf: 73 `multiple_permissive_policies` + 26 `auth_rls_initplan` |
| 13 | Sem plano de rollback / DR documentado | ⚠️ | Documentar `deploy/deploy.sh` remoto, procedimento de rollback e backup/restore do Supabase. | `DEPLOYMENT_PLAN.md` cobre deploy, não recuperação |

---

## 🟡 MÉDIO (melhoria)

| # | Item | Ação |
|---|------|------|
| 14 | God components (`InboxPage.tsx` 1425L, `AppContext.tsx` 968L, `ImportPage.tsx` 977L) | Decompor `AppContext` em contexts por domínio; extrair sub-componentes |
| 15 | Código duplicado | Criar `lib/error-handler.ts` e hook genérico de fetch; remover `RagContextInjector` duplicado e unificar `LandingPage`/`LandingPageEN` |
| 16 | Lock files conflitantes | Definir um gerenciador: remover `bun.lock`/`bun.lockb` se npm é oficial |
| 17 | Artefatos e pastas na raiz | Remover `lint_output.txt`/`tsc_output.txt` (e adicionar ao `.gitignore`); mover `CRM SALES/`, `Copywriter/`, `Deisgn System/`, `Prompts/`, PDF para `docs/` |
| 18 | CSP com `unsafe-inline`/`unsafe-eval` | Migrar para CSP baseada em nonce quando viável |
| 19 | `function_search_path_mutable` (16 funções) | Adicionar `SET search_path = ''` nas funções |
| 20 | `unused_index` (42) e extensões `vector`/`pg_net` no schema public | Remover índices não usados; mover extensões para schema próprio |
| 21 | Leaked password protection desativado | Ativar HaveIBeenPwned no Supabase Auth |

---

## 🟢 OK (passou — com evidência)

| # | Item | Evidência |
|---|------|-----------|
| OK-1 | **Isolamento multi-tenant (RLS)** — validado em produção | `leads`/`tasks`/`pipeline_columns`/`timeline_events` usam `tenant_id = get_user_tenant_id() OR is_master_user()`. As políticas legadas `USING (true)` **não existem em produção** (migration de correção foi aplicada) |
| OK-2 | Tabelas com RLS ativo e deny-by-default | `api_keys`, `webhook_endpoints`, `webhook_deliveries` etc. têm RLS ativo sem policy = sem acesso para anon/authenticated |
| OK-3 | HTTPS/HSTS/CSP | `public/_headers`: HSTS `max-age=31536000; includeSubDomains; preload` + CSP + X-Frame-Options |
| OK-4 | Autenticação | Supabase Auth (`signInWithPassword`), idle timeout 30min (`AuthContext.tsx`), JWT gerenciado pelo Supabase |
| OK-5 | Injeção (SQL/XSS/CSRF) | Queries parametrizadas via supabase-js; DOMPurify em conteúdo HTML; CSRF state em OAuth callback |
| OK-6 | `read_secret` protegido | `REVOKE EXECUTE ... FROM anon, authenticated` (advisor está desatualizado nesse ponto) |
| OK-7 | Logs sem dados sensíveis | `lib/logger.ts` dev-only em produção; nenhum token/senha logado |
| OK-8 | Build, code-splitting e Service Worker | `lazy()` em 20+ rotas, vendor chunks separados, SW network-first com versionamento automático |
| OK-9 | Migrations versionadas | 77 migrations ordenadas e descritivas em `supabase/migrations/` |
| OK-10 | Deploy atômico | `deploy/deploy.sh` usa swap `.new/.old` para zero-downtime |

---

## 📌 Próximos passos (ordem recomendada)

1. **Hoje:** remover `.env.production` do Git + `.gitignore` + **rotacionar a anon key e os secrets Meta** (itens 1).
2. **Hoje:** `npm audit fix` para o react-router (item 5).
3. **Esta semana:** `QueryClient` com defaults + `ErrorBoundary` nas rotas + `toast.error` nos hooks mudos (itens 3, 4).
4. **Esta semana:** revogar `EXECUTE` das funções `SECURITY DEFINER` internas e validar `tenant_id` nas RPCs de org (itens 6, 9).
5. **Esta sprint:** ativar `strict: true` e reduzir `any` (item 2); índices compostos + selects explícitos (item 10).
6. **Esta sprint:** suite E2E Playwright para auth + isolamento de tenant (item 11).

---

## 🏁 GO / NO-GO

- [ ] **Críticos resolvidos** — ❌ 4 abertos (`.env.production`, strict, erros silenciosos, QueryClient)
- [ ] 80% dos Altos resolvidos — ❌ pendente
- [x] Isolamento multi-tenant verificado em produção — ✅ **OK**
- [ ] Code review final aprovado
- [ ] Staging testado

**Veredito atual: 🔴 NO-GO.** A base de segurança de dados (RLS multi-tenant) está sólida e verificada,
mas há **4 críticos** que devem ser tratados antes do deploy — sendo o mais urgente o `.env.production`
versionado, que exige rotação de chaves independentemente de qualquer outra ação.
