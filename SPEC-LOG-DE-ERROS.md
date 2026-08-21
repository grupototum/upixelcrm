# Spec — Log de Erros (Configurações → Log de Erros)

> **Modo:** especificação apenas. Nenhuma migration foi aplicada, nenhum arquivo de produção foi
> criado ou alterado nesta rodada. O SQL abaixo é para revisão humana antes de rodar.

> **[corr-5] Fase 2+ bloqueada até Correção 1 estar aplicada em produção, Correção 0 (PC-040)
> aprovada, Correção 3 (inspeção `error_logs`) decidida e Correção 2 (credencial) esclarecida.
> Confirmado 2026-08-21. Nenhuma implementação de UI/hook desta spec começa antes disso.**

## Motivação

O erro "Erro ao criar chave de API." (diagnosticado em `AUDITORIA-API-KEYS.md`) é sintoma de um
problema estrutural: o sistema não tem observabilidade de erros para o usuário final. `src/lib/logger.ts`
já grava em `public.error_logs` em produção, mas (a) só grava a coluna `message`, sem contexto,
(b) ninguém lê — não existe UI. Esta spec fecha esse ciclo.

## Três desvios recomendados em relação ao texto original do pedido — e por quê

1. **Estender `public.error_logs` em vez de criar `error_log` do zero** (decisão do Rael).
   A tabela já existe em produção com **1013 linhas reais** e **2 policies ativas** — uma delas
   (`"Master read error_logs"`) já é exatamente o que a feature precisa para a visão do master.
   Criar `error_log` do zero jogaria fora esse histórico e deixaria duas tabelas quase idênticas
   coexistindo. A complicação real a resolver: **não existe migration dela no repo** — a tabela
   só vive em produção (drift documentado em `docs/CLEANUP_REPORT.md` e no achado A-06 desta
   auditoria). A migration da Fase 1 abaixo primeiro espelha o `CREATE TABLE`/policies reais
   (mesmo padrão usado em `supabase/migrations/9999_reconcile_drift.sql`) e só então adiciona colunas.

2. **Enriquecer `src/lib/logger.ts` em vez de criar `src/lib/errorReporter.ts` paralelo.**
   `logger.error()` já é chamado em **103 lugares** de `src/` e já é a exceção arquitetural
   documentada em `totum-state.md:168-175` para `supabase.from` fora de `services/`. Introduzir um
   helper novo (`captureError({where, what, error, severity})`) obrigaria reescrever 103 call
   sites ou manter dois caminhos de log divergentes. Em vez disso, o `logger` ganha um 5º
   parâmetro opcional de contexto e passa a ler `tenant_id`/`user_id` de um módulo de sessão global
   (ver Fase 1).

3. **Reusar `src/lib/edge-error.ts` (`extractEdgeError`)**, hoje subutilizado, para desembrulhar
   erros de `FunctionsHttpError` antes de logá-los — evita duplicar a lógica de "abrir o body da
   edge function" que esse helper já resolve.

## Comportamento por role

### Usuário master (`user.role === "master"`)

Sempre que um erro do sistema estourar (catch de frontend, edge function 4xx/5xx, erro de
RPC/RLS), toast enriquecido com:
- **ONDE:** rota do frontend + componente/handler + (se aplicável) nome da edge function/RPC.
- **O QUE tentava fazer:** ação em linguagem natural ("criar chave de API").
- **Código do erro:** o `id` do registro em `error_logs`, correlacionável com a página de detalhe.

O erro completo (stack sanitizada, payload sanitizado, timestamp, user_id, tenant_id) é gravado em
`error_logs`. `Configurações → Log de Erros` lista os últimos 500 erros do tenant, com filtro por
data/rota/severidade e detalhe expansível.

### Usuário não-master

Toast simples: "Ocorreu um erro. Deseja gerar um relatório para o administrador?". Se aceitar, modal
com "O que você estava tentando fazer?" (obrigatório), "Passos para reproduzir" (opcional),
checkbox "Incluir screenshot" (opcional — ver risco de dependência abaixo). Grava em `error_report`
(tabela nova). Visível apenas para roles master/admin/supervisor na aba "Relatórios de usuários".

> **Nota de guard:** hoje `user?.role === "master"` é checado inline em vários lugares
> (`src/contexts/AppContext.tsx:114`, `SettingsPage.tsx`), mas `usePermissions.ts` trata
> `master`/`admin`/`supervisor` como equivalentes para fins de `requiredPermission`. A leitura de
> `error_logs` (dados de outros usuários) **precisa** do guard estrito `isMaster`, não de
> `hasPermission`. A migration usa `is_master_user()`, que já é a fonte de verdade estrita no banco.

## Migration SQL completa

```sql
-- ────────────────────────────────────────────────────────
-- 0. Reconciliação: espelha o error_logs real de produção
--    (RLS habilitado, 2 policies, sem arquivo local hoje — ver A-06 na auditoria)
-- ────────────────────────────────────────────────────────
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  user_id uuid references auth.users(id),
  message text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

-- as 2 policies medidas em produção (recriar apenas se ausentes)
drop policy if exists "Master read error_logs" on public.error_logs;
create policy "Master read error_logs"
  on public.error_logs for select
  using ( (select public.is_master_user()) );

-- ────────────────────────────────────────────────────────
-- 1. Fase 1 — enriquecer error_logs com as colunas da spec
-- ────────────────────────────────────────────────────────
alter table public.error_logs
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists severity text not null default 'error'
    check (severity in ('info','warn','error','fatal')),
  add column if not exists where_source text,      -- "src/pages/ApiKeysPage.tsx :: handleCreate"
  add column if not exists where_backend text,     -- "edge:create-api-key" ou "rpc:create_api_key"
  add column if not exists what_action text,       -- "criar chave de API"
  add column if not exists error_code text,        -- "42501", "PGRST116", "AUTH-001"
  add column if not exists stack text,              -- stack sanitizada
  add column if not exists user_agent text,
  add column if not exists route text;

-- `message` já existe e vira o error_message da spec; `context` (jsonb) vira o `payload` sanitizado —
-- reaproveitados em vez de duplicados.

-- fecha o INSERT hoje aberto para {public} (achado A-06)
drop policy if exists "Service role insert error_logs" on public.error_logs;
create policy "Tenant scoped insert error_logs"
  on public.error_logs for insert to authenticated
  with check (
    (select public.is_master_user())
    or tenant_id is null
    or tenant_id = (select public.get_user_tenant_id())
  );

-- leitura tenant-scoped para master (mantém a policy medida, mas com filtro de tenant p/ consistência
-- futura se o produto crescer para múltiplos masters por tenant)
drop policy if exists "Master read error_logs" on public.error_logs;
create policy "Master read error_logs"
  on public.error_logs for select to authenticated
  using ( (select public.is_master_user()) );

create index if not exists idx_error_logs_tenant_created
  on public.error_logs (tenant_id, created_at desc);

-- ────────────────────────────────────────────────────────
-- 2. Fase 3 — error_report (tabela nova, como no pedido original)
-- ────────────────────────────────────────────────────────
create table public.error_report (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references auth.users(id),
  reported_at timestamptz not null default now(),
  what_user_tried text not null,
  reproduction_steps text,
  screenshot_url text,
  linked_error_log_id uuid references public.error_logs(id),
  status text not null default 'open' check (status in ('open','triaged','resolved','wontfix')),
  admin_notes text
);

alter table public.error_report enable row level security;

create policy "Author or master read error_report"
  on public.error_report for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_master_user())
    or ( (select public.get_user_role()) in ('supervisor','admin')
         and tenant_id = (select public.get_user_tenant_id()) )
  );

create policy "Tenant scoped insert error_report"
  on public.error_report for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (tenant_id = (select public.get_user_tenant_id()) or (select public.is_master_user()))
  );

create policy "Admin update error_report"
  on public.error_report for update to authenticated
  using (
    (select public.is_master_user())
    or ( (select public.get_user_role()) in ('supervisor','admin')
         and tenant_id = (select public.get_user_tenant_id()) )
  );

create index if not exists idx_error_report_tenant_status
  on public.error_report (tenant_id, status, reported_at desc);
```

## Arquivos a criar

| Arquivo | Conteúdo |
|---|---|
| `src/services/errorLogs.ts` | `listErrorLogs(tenantId, filters, limit=500)`, `createErrorReport(...)` — segue o padrão de `src/services/users.ts:147` (`supabase.from("error_logs").select("*").order("created_at",{ascending:false}).limit(limit)` + `.eq("tenant_id", tenantId)` quando não-master) |
| `src/hooks/useErrorLogs.ts` | `useQuery({queryKey:["error-logs", tenantId, filters], queryFn: ...})`, no padrão de `src/hooks/useGoals.ts` |
| `src/pages/settings/ErrorLogPage.tsx` | Tabela + filtros (data/rota/severidade) + detalhe expansível; modelo visual: `src/pages/DatabaseBackupPage.tsx` (useQuery + useMutation + StatusDot + `format(...ptBR)`) |
| `src/components/errors/ErrorReportModal.tsx` | Modal para não-master: textarea obrigatório + opcional + checkbox screenshot |
| `supabase/migrations/<timestamp>_error_logs_observability.sql` | O SQL acima |

## Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| `src/lib/logger.ts` | `sendError` passa a receber contexto (`where`, `what`, `severity`, `tenant_id`, `user_id`) em vez de só concatenar `args`; ler tenant/user de um módulo de sessão exportado por `AuthContext`/`TenantContext` (evitar import circular — expor via um pequeno singleton atualizado no login, não importar o Context direto). Sanitizar `payload` antes de gravar (ver Riscos). |
| `src/pages/SettingsPage.tsx` | 3 edits, padrão da aba "Dados": adicionar `"error-log"` a `TabId`/`VALID_TABS`; `<TabsTrigger value="error-log">` condicionado a `isMaster \|\| canAccessModule(...)`; `<TabsContent value="error-log">` renderizando `<ErrorLogPage/>` ou um Card com botão "Abrir" (mesmo padrão do bloco master-only de backup) |
| `src/App.tsx` | Rota lazy `/settings/error-log` ou reaproveitar `/settings/:tab`, envolta em `<ProtectedRoute>` |
| `src/components/ErrorBoundary.tsx` | `componentDidCatch` passa `error.stack` e `info.componentStack` para `logger.error` com `where: "ErrorBoundary"` em vez de só a mensagem; **remover a duplicação** com `main.tsx:10` (um só boundary) |
| `src/main.tsx` | Adicionar `window.addEventListener("error", ...)` e `window.addEventListener("unhandledrejection", ...)` chamando `logger.error` — hoje erros fora do render React (event handlers assíncronos, promises soltas) não chegam a lugar nenhum |
| `src/lib/edge-error.ts` | Nenhuma mudança de código — só passa a ser chamado nos catches que hoje descartam o erro de edge function (ex.: `ApiSettingsModal.tsx`, uma vez que o fix de RLS estiver aplicado) |

## Roadmap de implementação em fases

| Fase | Escopo | Esforço |
|---|---|---|
| **1** | Migration (reconciliação + colunas novas + policies), `src/lib/logger.ts` enriquecido, sessão global de tenant/user para o logger | 0.5–1 dia |
| **2** | `ErrorLogPage.tsx` (master), `errorLogs.ts`, `useErrorLogs.ts`, item de menu em Configurações | 1 dia |
| **3** | `ErrorReportModal.tsx` (não-master) + tabela `error_report` + aba "Relatórios de usuários" | 1 dia |
| **4** | Cobertura incremental: substituir catches genéricos pelos 103 call sites de `logger.error`, priorizando os 58 `catch {}` vazios e os que já engolem `error.message` (ver `AUDITORIA-API-KEYS.md`); screenshot opcional (dependência nova) | 2–3 dias, incremental — não é bloqueante para lançar as Fases 1–3 |

## Riscos

- **Vazamento de dados sensíveis em `context`/`payload jsonb`.** Regra obrigatória no `logger.ts`
  antes de gravar: nunca persistir um campo cujo valor case regex de JWT (`^eyJ`), token
  (`sk_[A-Za-z0-9]{20,}`), base64 longo (`[A-Za-z0-9+/]{40,}={0,2}`) ou chave `password`/`senha`/`token`
  no nome — substituir por `"[REDACTED]"`. Reaproveitar o padrão de `redact()` já existente em
  `supabase/functions/_shared/logger.ts` (edge side) como referência de implementação no client.
- **Guard de role.** `usePermissions.ts` não distingue master de admin/supervisor para
  `requiredPermission` — a policy de banco (`is_master_user()`) é a fonte de verdade real, não o
  guard de rota sozinho. A UI deve checar `user?.role === "master"` explicitamente para a aba
  "Log de Erros" completa, e permissão de tenant para "Relatórios de usuários".
- **`html2canvas` não está instalado** — screenshot é dependência nova. Fica marcado como opcional
  na Fase 4; alternativa nativa sem dependência é `navigator.mediaDevices.getDisplayMedia`, mas
  exige gesto explícito do usuário e abre um picker do SO (pior UX que uma lib, mas zero-dependency).
- **Bucket de storage para screenshot** exigiria política nova; o único precedente de política de
  storage no repo (`supabase/migrations/20260810150000_pc038_storage_policies.sql`) está marcado
  no próprio arquivo como "RASCUNHO PARA REVISÃO — NÃO APLICADO" — não copiar sem revisão humana.
- **Volume.** Hoje já há 290 `toast.error` e 58 `catch {}` vazios em `src/`. Cobrir 100% na Fase 4
  de uma vez pode inundar `error_logs`. Recomendação: manter o `limit(500)` da spec e adicionar
  uma política de retenção (ex.: job agendado apagando `created_at < now() - interval '90 days'`)
  antes de expandir a cobertura — não incluído nesta spec, citado como decisão futura.
- **`error_logs.client_id` (coluna legada, tipo `text`) convive com `tenant_id` (novo, `uuid`)
  durante a transição** — registros antigos (as 1013 linhas já gravadas) terão `tenant_id = null`.
  A policy de leitura do master cobre isso (`is_master_user()` sem depender de `tenant_id`), mas a
  UI deve tratar `tenant_id: null` como "anterior à instrumentação" na lista, não como erro.
