# TODO.md — uPixel CRM

**Atualizado:** 2026-05-10  
**Sistema:** Vibe Coding Totum v3.0  
**Base:** Revisão Pré-Produção 6 categorias (ver BUGS.md)

---

## 🔴 CRÍTICO — Resolver antes do próximo deploy

- [ ] **[CAT-2 DRY]** Unificar `LandingPage.tsx` + `LandingPageEN.tsx`
  - 514 linhas duplicadas, apenas textos diferem
  - Criar `LandingPage.tsx` com prop `lang="pt"|"en"` ou implementar i18n
  - Arquivos: `src/pages/LandingPage.tsx`, `src/pages/LandingPageEN.tsx`

- [ ] **[CAT-3 PERF]** Quebrar `AppContext.tsx` em contextos por domínio
  - 914 linhas causam re-render de toda a app a cada mudança
  - Proposta: `CRMContext`, `TaskContext`, `AutomationContext`, `UIContext`
  - Arquivo: `src/contexts/AppContext.tsx`

- [ ] **[CAT-5 SRP]** Refatorar `InboxPage.tsx` (1365 linhas)
  - Extrair: `useChatLogic`, `useWhatsAppAPI`, `useRealtimeMessages`
  - UI deve ser declarativa, lógica em hooks separados

---

## 🟡 ALTO — Esta sprint

- [ ] **[CAT-1 MORTO]** Resolver `RagContextInjector.tsx` duplicado
  - `src/components/chat/RagContextInjector.tsx` e `src/components/alexandria/RagContextInjector.tsx`
  - Mesmos nomes, implementações diferentes — risco de importar o errado
  - Definir qual é canônico, remover ou renomear o outro

- [ ] **[CAT-4 ERROS]** Adicionar try/catch de rede em hooks
  - `src/hooks/useSequences.ts` — tratar erros de conexão/timeout
  - `src/hooks/useCannedResponses.ts` — idem
  - Modelo: `catch (err) { if (err instanceof NetworkError) ... }`

- [ ] **[CAT-4 ERROS]** Adicionar `ErrorBoundary` no root da aplicação
  - Atualmente nenhum ErrorBoundary React presente
  - Adicionar ao menos em `App.tsx` ou `main.tsx`

- [ ] **[CAT-3 PERF]** Corrigir 22 `useEffect` com deps incompletas
  - Priorizar: inbox, automations (maior risco de stale closures)
  - Rodar: `npm run lint` e corrigir `react-hooks/exhaustive-deps` warnings
  - Módulos prioritários: `InboxPage`, hooks de automações

- [ ] **[CAT-5 SRP]** Dividir `AppContext.tsx` (914 linhas, God Context)
  - 20+ operações de CRUD de domínios diferentes num único contexto
  - Relacionado ao item crítico de performance acima

- [ ] **[CAT-5 SRP]** Refatorar `UsersPage.tsx` (845 linhas)
  - Separar: listagem, formulário de criação/edição, lógica de permissões

- [ ] **[CAT-5 SRP]** Refatorar `ImportPage.tsx` (762 linhas)
  - Extrair: `useCsvParser`, `useExcelParser` — separar parse de UI

- [ ] **[CAT-5 SRP]** Refatorar `LeadProfilePage.tsx` (721 linhas)
  - Extrair: `useLeadTimeline`, `useLeadTasks`, componentes `<LeadNotes />`, `<LeadTimeline />`

- [ ] **[CAT-6 TS]** Tipar `AppContext.tsx` — remover 7 ocorrências de `(c: any)` e `(row as any)`
  - Área crítica: contexto de auth/tenant
  - Prioridade máxima dentro dos 404 `any` do projeto

---

## 🟢 MÉDIO — Backlog

- [ ] **[CAT-1 MORTO]** Verificar se `.env.migration` e `.env.debug` ainda são necessários
  - Arquivar ou documentar uso, senão remover

- [ ] **[CAT-4 ERROS]** Adicionar `ErrorBoundary` por módulo (inbox, leads, automations)

- [ ] **[CAT-5 SRP]** Refatorar `DatabaseBackupPage.tsx` (687 linhas)

- [ ] **[CAT-3 PERF]** Monitorar crescimento dos 120 `useEffect` no projeto
  - Criar convenção de lint customizado se crescer além de 150

---

## ⚪ BAIXO — Quando tiver tempo

- [ ] **[CAT-6 TS]** Tipar gradualmente as ~404 ocorrências de `any`
  - Começar pelas integrações Google (Calendar/Drive/Gmail) e módulo de automações
  - Usar `as unknown as TagMeta` → criar tipos Supabase corretos

- [ ] **[CAT-7 UI]** Verificar se `LandingPageEN.tsx` usa variáveis CSS do tema ou cores hardcoded
  - (Após unificação no item crítico acima, isso será resolvido automaticamente)

- [ ] **[LINT]** Remover 2 `unused eslint-disable` em `scripts/`
  - `npm run lint -- --fix` corrige automaticamente

---

## ✅ CONCLUÍDO NESTA SESSÃO (2026-05-10)

- [x] CLAUDE.md atualizado para Vibe Coding Totum v3.0
- [x] KIMI.md atualizado para v2.0
- [x] BUGS.md criado com revisão pré-produção completa (6 categorias)
- [x] INDEX.md, CHECKLIST_PADRAO.md, BULMA_INDEX.md atualizados no sistema

---

## COMANDOS RÁPIDOS

```bash
# Rodar lint e ver todos os warnings
npm run lint

# Corrigir automaticamente os 2 unused-disable
npm run lint -- --fix

# Build check
npm run build

# Ver componentes grandes
find src -name "*.tsx" -exec wc -l {} + | sort -n | tail -20
```

---

*TODO.md — uPixel CRM — Vibe Coding Totum v3.0 — 2026-05-10*
