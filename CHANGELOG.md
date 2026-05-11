# CHANGELOG — uPixel CRM

**Sistema:** Vibe Coding Totum v3.0  
Formato: `[tipo] descrição — arquivo(s) afetado(s)`  
Tipos: `feat` | `fix` | `refactor` | `docs` | `chore` | `perf` | `security`

---

## [Unreleased] — Branch: main

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
