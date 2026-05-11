# BUGS.md — uPixel CRM

**Atualizado:** 2026-05-10  
**Sistema:** Vibe Coding Totum v3.0

---

## LEGENDA DE PRIORIDADE

| Símbolo | Prioridade | Ação |
|---|---|---|
| 🔴 | Crítico / Bloqueador | Resolver antes de qualquer deploy |
| 🟡 | Alto | Resolver nesta sprint |
| 🟢 | Médio | Backlog próxima sprint |
| ⚪ | Baixo / Técnico | Quando tiver tempo |

---

## BUGS ATIVOS

*(nenhum bug crítico registrado em 2026-05-10)*

---

## DÍVIDA TÉCNICA — LINT (428 warnings)

> `npm run lint` — 2026-05-10 — **0 errors, 428 warnings**

### Categorias

| Categoria | Regra ESLint | Qtd | Prioridade |
|---|---|---|---|
| Tipos `any` explícitos | `@typescript-eslint/no-explicit-any` | ~404 | ⚪ Baixo |
| Deps ausentes em hooks | `react-hooks/exhaustive-deps` | ~22 | 🟢 Médio |
| eslint-disable desnecessário | `no-unused-disable` | 2 | ⚪ Baixo |

### Estratégia de Resolução

1. **react-hooks/exhaustive-deps (22 ocorrências)** — prioridade maior, podem causar bugs de comportamento
   - Arquivos mais afetados: `CalendarTab.tsx`, `DriveTab.tsx`, `GmailTab.tsx`, `RAGIntegrationStatus.tsx`, `AutomationSidebar.tsx`, `AddTagModal.tsx`
   - Ação: usar `useCallback` com deps corretas ou `eslint-disable` justificado
   
2. **@typescript-eslint/no-explicit-any (~404 ocorrências)** — dívida técnica acumulada
   - Concentrado em: integrações Google (Calendar/Drive/Gmail), módulo de automações
   - Ação: refatorar gradualmente com interfaces corretas por módulo
   - Usar `skill-refatorador-dry.md` para identificar tipos comuns reutilizáveis

3. **Unused eslint-disable (2 ocorrências)** — trivial, remover
   - `scripts/export-supabase.mjs` linha 2
   - `scripts/import-supabase.mjs` linha 2

### Comando de fix automático (parcial)
```bash
npm run lint -- --fix
# Corrige: unused eslint-disable (2 warnings)
```

---

## HISTÓRICO DE BUGS RESOLVIDOS

| Data | Bug | Solução | Commit |
|---|---|---|---|
| — | — | — | — |

---

*BUGS.md — uPixel CRM — Sistema Vibe Coding Totum v3.0*
