# CHANGELOG — uPixel CRM

**Sistema:** Vibe Coding Totum v3.0  
Formato: `[tipo] descrição — arquivo(s) afetado(s)`  
Tipos: `feat` | `fix` | `refactor` | `docs` | `chore` | `perf` | `security`

---

## [Unreleased] — Branch: main

---

## 📅 2026-05-22 — Sessão: features CRM + bug fixes

### ✅ Consertado
- `fix` Bug crítico: "Enviar mensagem" no perfil do lead abria inbox geral em vez de chat direto → agora abre conversa existente ou modal nova conversa com phone pré-preenchido (`2b67140`)
- `fix` Multi-tenant: 5 edge functions criavam registros órfãos quando user master operava (whatsapp-proxy, whatsapp-cloud-proxy, facebook-page-embedded-signup, instagram-exchange-token + outras) — todas com `resolveClientId` server-side + hard-bind de `tenant_id` (`58419c8`, `9985975`)
- `fix` Bug trigger Postgres `handle_lead_automation_on_insert`: `v_auto.tenant_id` sem `SELECT tenant_id` — bloqueava insert de leads
- `fix` Badge do inbox na sidebar usando `user.client_id` direto (mostrava contagem do master orphan) (`1a3c88d`)
- `fix` Seletor de funil voltava pro principal sozinho — auto-switch rodava em toda carga em vez de só na primeira (`3d4c331`)
- `fix` Crash `pipelineId is not defined` no CRM (`57f66c3`)
- `fix` Dedup de phone na importação colidia DDDs (`slice(-8)` → DDD+8) (`fdee9e7`)
- `fix` 406 client_credits + 404 ad_campaigns silenciados (`b9c78b1`)

### 🔄 Alterado / Migrado
- **DB cleanup multi-tenant** (não tinha como reverter, isolamento por tenant agora 100%):
  - 17 leads órfãos (Matheus master) → tenant Totum
  - 6 leads de "Atendimento e Triagem" → Totum/Campanhas/Novos Leads
  - 27 leads legados (`demo1`+`c1`) → Olá Demo
  - 110 conversas legadas `c1` → Olá Demo
  - 13 conversas órfãs WhatsApp ativas → Totum + criados 13 leads novos com nomes reais do perfil WhatsApp
  - 7 conversas órfãs (master) → Totum
  - 212 messages re-sincronizadas com client_id da conversation pai
  - 2 conversas residuais (1 `c1` órfã + 1 `master` sentinela) deletadas
  - 4 integrations WhatsApp órfãs com `tenant_id` correto + FB Page + Instagram preenchidos
- **Profiles**:
  - Matheus Felipe (`matheusfelipemktg`): role `master` → `admin` Totum
  - Vinicius Oliveira: profile + auth.users **deletados** (não trabalha mais)
  - Master verdadeiro singleton: apenas `master@upixel.com.br`
- **Pipeline**: "Atendimento e Triagem" órfão (0 leads) **deletado**
- **ASAAS_WEBHOOK_TOKEN** rotacionado pra valor forte; webhook validado end-to-end
- **Frontend rename**: "Pipeline" → "Funil de Vendas" (sidebar, breadcrumbs, CRM header, bots, automations) (`b9c78b1`)
- `perf` Removido polling redundante de 60s em `useUnreadCounts` (realtime cobre) (`3e81aeb`)
- `perf` `AppContext.fetchAll` não re-baixa 8000 leads ao trocar funil (`3e81aeb`)
- `perf` 7 índices DB criados (messages/tasks/timeline/conversations composites)
- `security` CSP + HSTS + security headers no nginx + `_headers` Cloudflare (`05e6cb5`)
- `security` Edge functions com signature verification + ownership checks (`26524d0`)
- `security` Frontend: idle timeout 30min + realtime block listener (`2a59c43`)

### 🆕 Criado
- **Multi-select de leads no CRM** + ações em massa (Mover, Excluir, Adicionar Tag) (`f1bbdb0`)
- **Reordenar colunas do funil via drag-and-drop** (handle no header) (`1687023`)
- **Painel /master/integrations** — visão global de integrações por tenant (master-only) (`f78629d`)
- **Toggle ativar/desativar WhatsApp** (Cloud + Lite) — pausa preserva credenciais (`0df05e1`)
- **Hierarquia de roles documentada**: master / admin / gerente / vendedor / atendente (memory)
- **Plano técnico FB+IG comments/stories triggers** salvo em memória pra sessão dedicada
- **Helper `resolveClientId`** central (frontend + edge fns) — previne novos órfãos
- **Breadcrumbs em todas páginas autenticadas** (`e073afd`)
- **Importação `.xlsx`** + sugestão automática de tipo de campo personalizado
- **/master/integrations** + indicador visual de integrações órfãs
- **Pipeline auto-creation** quando webhook recebe msg em tenant sem colunas

---

## [docs] 2026-05-10 — Modo Madruga: Adequação Vibe Coding Totum v3.0

### Documentação

- `docs` CLAUDE.md atualizado v1.0 → v3.0
  - Adicionado nível LP/Site à pergunta-gatilho
  - Adicionada Fase 0 com tabela de saúde técnica
  - Adicionadas referências às skills especializadas
  - Adicionada Totum Torah (7 leis que nunca mudam)
  - Revisão pré-produção documentada

- `docs` KIMI.md atualizado v1.0 → v2.0
  - Adicionado nível LP/Site
  - Tabela de saúde técnica sincronizada com CLAUDE.md

- `docs` BUGS.md criado — Revisão Pré-Produção 6 Categorias
  - Cat 1 (Código Morto): LandingPage.tsx/EN duplicação, RagContextInjector conflito
  - Cat 2 (DRY): LandingPage PT/EN 514 linhas iguais, AppContext God Context
  - Cat 3 (Performance): AppContext re-render global, 22 exhaustive-deps, 120 useEffects
  - Cat 4 (Erros): ✅ logger module, ✅ toasts Supabase, ⚠️ sem try/catch de rede, sem ErrorBoundary
  - Cat 5 (SRP): InboxPage (1365), AppContext (914), UsersPage (845), ImportPage (762), LeadProfilePage (721)
  - Cat 6 (TypeScript): 404 any, 7 any críticos em AppContext, strict mode ✅
  - Lint: 0 errors, 428 warnings documentados

- `docs` TODO.md criado com ações priorizadas por severidade (🔴/🟡/🟢/⚪)

---

## [fix] 2026-05-07 — FIX-07: tenant_id from profiles

- `fix` AppContext.tsx — tenant_id lido de `profiles` em vez de `user_metadata`
  - Corrige isolamento multi-tenant por subdomínio
  - Ver linha 70 do AppContext.tsx para detalhes

---

*CHANGELOG.md — uPixel CRM — Vibe Coding Totum v3.0*
