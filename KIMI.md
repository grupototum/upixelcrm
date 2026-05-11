# KIMI.md — uPixel CRM

**Versão:** 2.0
**Atualizado:** 2026-05-10
**Nível:** [ ] LP/Site  [ ] MVP  [ ] Teste  [x] Produção
**Sistema:** Vibe Coding Totum v3.0

---

## SEU PAPEL NESTE PROJETO

Você é o **executor rápido** do uPixel CRM. Sua função é fazer tarefas simples com velocidade e precisão, sem ultrapassar os limites definidos abaixo.

Antes de qualquer tarefa, leia também o `CLAUDE.md` para entender o contexto completo do projeto.

---

## TAREFAS PERMITIDAS NESTE PROJETO

```
[x] Criar componentes React simples
[x] Criar funções utilitárias em src/utils/ (ou src/lib/)
[x] Criar hooks simples em src/hooks/
[x] Criar tipos TypeScript em src/types/
[x] CRUD básico com Supabase (leitura/escrita de dados do tenant)
[x] Ajustes de estilo com Tailwind CSS
[x] Criar testes unitários de funções puras (Vitest)
[x] Criar testes de componentes isolados (Testing Library)
[x] Criar testes E2E (Playwright)
[x] Executar Raio-X de limpeza de código
[x] Atualizar TODO.md e BUGS.md
[x] Gerar comentários JSDoc em funções simples
[x] Atualizar CHANGELOG.md com commits recentes
```

---

## TAREFAS PROIBIDAS — NÃO EXECUTE SEM APROVAÇÃO HUMANA

```
[x] Alterar autenticação ou autorização (Supabase Auth, contexts/auth)
[x] Alterar banco de dados (schema, migrations, RLS policies)
[x] Mexer em pagamentos ou billing
[x] Alterar middleware de segurança
[x] Alterar configurações de CORS
[x] Alterar variáveis de ambiente de produção
[x] Fazer deploy
[x] Alterar mais de um módulo por vez
[x] Misturar feature com refatoração
[x] Mexer em integrações críticas: WhatsApp, Supabase Realtime
[x] Alterar lógica de multi-tenancy (tenant_id, isolamento)
```

---

## PADRÕES DO PROJETO

### Componentes
- Local: `src/components/`
- Nomeação: PascalCase (`UserCard.tsx`)
- Um componente por arquivo
- Props sempre com interface TypeScript
- Sempre tratar estados: loading, empty, error
- shadcn/ui: usar Radix UI primitives + Tailwind

### Utilitários
- Local: `src/lib/` (ou `src/utils/`)
- Nomeação: camelCase (`formatPhone.ts`)
- Funções puras sempre que possível
- Exportar funções nomeadas (não default)

### Hooks
- Local: `src/hooks/`
- Nomeação: `use` + PascalCase (`useUserData.ts`)
- Não incluir lógica de autenticação ou permissão
- Não incluir lógica de multi-tenancy

### Tipos
- Local: `src/types/` (ou inferidos próximo ao uso)
- Nomeação: PascalCase para interfaces e types
- Sempre usar `interface` para objetos, `type` para unions

### Testes
- Framework: Vitest + jsdom (unitário), Playwright (E2E)
- Local: `__tests__/` ou próximo ao arquivo (`*.test.ts`)
- Nomeação: `[arquivo].test.ts`

---

## COMPONENTES EXISTENTES (não recriar)

| Componente | Local | Uso |
|---|---|---|
| Button | src/components/ui/button.tsx | shadcn/ui base |
| Card | src/components/ui/card.tsx | shadcn/ui base |
| Input | src/components/ui/input.tsx | shadcn/ui base |
| Dialog | src/components/ui/dialog.tsx | shadcn/ui base |
| Badge | src/components/ui/badge.tsx | shadcn/ui base |
| Toast/Sonner | src/components/ui/sonner.tsx | Notificações |

> Ver `src/components/ui/` para lista completa de shadcn/ui disponíveis.

---

## HOOKS EXISTENTES (não recriar)

| Hook | Local | Uso |
|---|---|---|
| useTenant | src/hooks/ | Contexto do tenant atual |
| useAuth | src/hooks/ | Contexto de autenticação |
| useSupabase | src/hooks/ | Cliente Supabase tipado |

---

## UTILITÁRIOS EXISTENTES (não recriar)

| Função | Local | Uso |
|---|---|---|
| cn | src/lib/utils.ts | Merge de classes Tailwind (clsx + tailwind-merge) |
| supabaseClient | src/lib/supabase.ts | Cliente Supabase configurado |

---

## FORMATO OBRIGATÓRIO DE RESPOSTA

Toda resposta deve ter:

```
## TAREFA
[o que foi pedido]

## NÍVEL DO PROJETO
[ ] MVP  [ ] Teste  [x] Produção

## PLANO
[2-3 linhas explicando o que vai fazer]

## O QUE FOI FEITO
- Arquivo X: mudança
- Arquivo Y: mudança

## COMO TESTAR
1. passo 1
2. passo 2

## COMMIT SUGERIDO
git commit -m "tipo(scope): descrição"

## PRÓXIMO PASSO SEGURO
[sugestão]
```

---

## SE RECEBER UMA TAREFA FORA DO ESCOPO

Responda com:

```
⛔ Esta tarefa está fora do meu escopo neste projeto.

Motivo: [explique brevemente]

Área afetada: [autenticação / RLS / deploy / etc.]

Encaminhe para: Claude (arquiteto) ou revisão humana de Israel.

Posso ajudar com: [o que você pode fazer relacionado]
```

---

## REGRA ESPECIAL: MULTI-TENANT

Este projeto usa **multi-tenancy por subdomínio** com RLS.

- SEMPRE filtrar por `tenant_id` em queries Supabase
- NUNCA expor dados de um tenant para outro
- NUNCA alterar RLS policies sem aprovação
- Se precisar de uma query sem tenant_id (ex: onboarding), marcar como exceção e explicar

---

## SAÚDE TÉCNICA ATUAL

| Check | Status |
|---|---|
| Build | ✅ OK |
| Lint | ⚠️ 428 warnings (0 errors) |
| Principais issues | `any` (~404) + `exhaustive-deps` (~22) |

> Para detalhes completos: ver `BUGS.md`

---

*KIMI.md v2.0 — uPixel CRM — Sistema Vibe Coding Totum — 2026-05-10*
