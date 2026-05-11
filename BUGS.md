# BUGS.md — uPixel CRM

**Atualizado:** 2026-05-10  
**Sistema:** Vibe Coding Totum v3.0  
**Revisão:** skill-revisao-pre-producao.md (6 categorias)

---

## LEGENDA

| Símbolo | Prioridade |
|---|---|
| 🔴 | Crítico — resolver antes de qualquer deploy |
| 🟡 | Alto — resolver nesta sprint |
| 🟢 | Médio — backlog |
| ⚪ | Baixo — quando tiver tempo |

---

## BUGS ATIVOS

*(nenhum bug funcional crítico registrado em 2026-05-10)*

---

## REVISÃO PRÉ-PRODUÇÃO — 6 CATEGORIAS (2026-05-10)

### CATEGORIA 1 — CÓDIGO MORTO / RAIO-X

| Severidade | Arquivo | Problema |
|---|---|---|
| 🟡 | `src/pages/LandingPage.tsx` + `LandingPageEN.tsx` | Dois arquivos de 514 linhas cada com estrutura idêntica (182 classes Tailwind iguais). Apenas textos diferem (PT vs EN). |
| 🟡 | `src/components/chat/RagContextInjector.tsx` + `src/components/alexandria/RagContextInjector.tsx` | Mesmo nome, implementações diferentes em pastas distintas — risco alto de importar o arquivo errado |
| ⚪ | `.env.migration`, `.env.debug` | Verificar se ainda são necessários ou podem ser arquivados |

---

### CATEGORIA 2 — DUPLICAÇÃO (DRY)

| Severidade | Local | Problema | Solução |
|---|---|---|---|
| 🔴 | `LandingPage.tsx` / `LandingPageEN.tsx` | 514 linhas duplicadas — só textos diferem | Criar `LandingPage.tsx` com prop `lang="pt"\|"en"` ou usar i18n |
| 🟡 | `AppContext.tsx` (914 linhas) | God Context com 20+ operações em um único arquivo | Dividir em: `CRMContext`, `TaskContext`, `AutomationContext` |
| 🟡 | Hooks sem try/catch | `useSequences`, `useCannedResponses` não capturam erros de rede | Adicionar try/catch para erros de conexão (distintos dos erros Supabase) |

---

### CATEGORIA 3 — PERFORMANCE

| Severidade | Arquivo | Problema | Solução |
|---|---|---|---|
| 🔴 | `src/contexts/AppContext.tsx` | Contexto único com leads + pipelines + tasks + automations + timeline. Qualquer mudança re-renderiza toda a app | Dividir em contextos menores por domínio |
| 🟡 | 22 `useEffect` com deps incompletas | `exhaustive-deps` warnings — risco de stale closures em produção | Corrigir um módulo por vez — priorizar inbox e automations |
| 🟢 | 120 `useEffect` no projeto | Normal para o tamanho, mas vale monitorar crescimento | — |

---

### CATEGORIA 4 — TRATAMENTO DE ERROS

| Severidade | Situação | Observação |
|---|---|---|
| ✅ | Logger module | Projeto usa `@/lib/logger` em vez de `console.log` direto — excelente |
| ✅ | Toast notifications | Erros do Supabase mostram toast para o usuário |
| 🟡 | Erros de rede | `useSequences.ts`, `useCannedResponses.ts` tratam erro do Supabase mas não erros de conexão/timeout |
| 🟢 | Error Boundaries | Nenhum `ErrorBoundary` React encontrado — adicionar ao menos no root |

---

### CATEGORIA 5 — SEPARAÇÃO DE RESPONSABILIDADES

| Severidade | Arquivo | Linhas | Problema |
|---|---|---|---|
| 🔴 | `InboxPage.tsx` | 1365 | UI + lógica de chat + API WhatsApp + realtime tudo junto |
| 🔴 | `AppContext.tsx` | 914 | God Context: 20+ operações de CRUD de domínios diferentes |
| 🟡 | `UsersPage.tsx` | 845 | Mistura listagem + criação + edição + permissões |
| 🟡 | `ImportPage.tsx` | 762 | Lógica de parse CSV/Excel misturada com UI |
| 🟡 | `LeadProfilePage.tsx` | 721 | Perfil + timeline + tarefas + notas tudo na mesma página |
| 🟢 | `DatabaseBackupPage.tsx` | 687 | Pode ser simplificado |

---

### CATEGORIA 6 — TYPESCRIPT

| Severidade | Problema | Qtd | Local |
|---|---|---|---|
| 🟡 | `any` explícito | ~404 | Concentrado em integrações Google (Calendar/Drive/Gmail) e módulo de automações |
| 🟡 | `(c: any)` e `(row as any)` em área crítica | 7 | `AppContext.tsx` — contexto de auth/tenant |
| ⚪ | `as unknown as TagMeta` | Vários hooks | Casting duplo — criar tipos Supabase corretos |
| ✅ | strict mode | — | Ativo — boa base |

---

### CATEGORIA 7 — ESTILO E CONSISTÊNCIA UI (Totum Stack)

| Severidade | Problema |
|---|---|
| 🟢 | Verificar se `LandingPageEN.tsx` usa variáveis CSS do tema ou cores hardcoded |
| ⚪ | 2 `unused eslint-disable` em `scripts/` — remover |

---

## DÍVIDA TÉCNICA — LINT (428 warnings)

> `npm run lint` — 2026-05-10 — **0 errors, 428 warnings**

| Categoria | Regra | Qtd | Prioridade |
|---|---|---|---|
| Tipos `any` explícitos | `@typescript-eslint/no-explicit-any` | ~404 | ⚪ Baixo |
| Deps ausentes em hooks | `react-hooks/exhaustive-deps` | ~22 | 🟡 Médio |
| eslint-disable desnecessário | `no-unused-disable` | 2 | ⚪ Trivial |

### Correção automática parcial
```bash
npm run lint -- --fix
# Corrige: 2 unused eslint-disable
```

---

## HISTÓRICO DE BUGS RESOLVIDOS

| Data | Bug | Solução | Commit |
|---|---|---|---|
| — | FIX-07: tenant_id from profiles (não user_metadata) | Corrigido no AppContext | ver AppContext.tsx linha 70 |

---

*BUGS.md — uPixel CRM — Sistema Vibe Coding Totum v3.0*
