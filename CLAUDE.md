# CLAUDE.md — uPixel CRM

**Versão:** 3.0
**Atualizado:** 2026-05-10
**Nível:** [ ] LP/Site  [ ] MVP  [ ] Teste  [x] Produção
**Sistema:** Vibe Coding Totum v3.0

---

## PERGUNTA-GATILHO (obrigatória antes de qualquer implementação)

> **Este é um projeto de PRODUÇÃO.**  
> Toda feature nova passa por: Revisão Pré-Produção → Raio-X → Teste → Deploy

---

## CONTEXTO DO PROJETO

**Nome:** uPixel CRM
**Descrição curta:** CRM SaaS multi-tenant por subdomínio para gestão de vendas e atendimento.
**Problema que resolve:** Empresas precisam de um CRM simples, rápido e com isolamento de dados por cliente.
**Usuário principal:** Gestores comerciais, vendedores e equipes de atendimento de pequenas e médias empresas.

---

## STACK

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind) |
| Backend / BaaS | Supabase |
| Autenticação | Supabase Auth |
| Banco de dados | PostgreSQL via Supabase |
| Roteamento | React Router DOM v6 |
| Estado & Dados | TanStack Query (React Query) |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Diagramas | React Flow |
| Drag & Drop | @dnd-kit |
| Testes | Vitest + Playwright + Testing Library |
| Deploy | Vercel (implied) |
| Versionamento | GitHub |

---

## ESTRUTURA DE PASTAS

```
src/
├── assets/        [imagens, ícones, fontes]
├── components/    [componentes reutilizáveis (shadcn/ui + custom)]
├── contexts/      [React contexts (auth, tenant, etc.)]
├── hooks/         [hooks customizados]
├── integrations/  [integrações externas (WhatsApp, etc.)]
├── lib/           [funções utilitárias, config Supabase]
├── modules/       [módulos de negócio]
├── pages/         [páginas/rotas da aplicação]
└── main.tsx       [entry point]
```

---

## COMANDOS ÚTEIS

```bash
npm run dev         # rodar em desenvolvimento (Vite)
npm run build       # build de produção
npm run build:dev   # build modo development
npm run lint        # verificar lint (ESLint)
npm run test        # rodar testes (Vitest)
npm run test:watch  # rodar testes em watch mode
npm run preview     # preview do build
```

---

## PADRÕES DE CÓDIGO

- TypeScript strict mode ativado
- Componentes: PascalCase (ex: `UserCard.tsx`)
- Funções e hooks: camelCase (ex: `useUserData`)
- Constantes: UPPER_SNAKE_CASE
- Arquivos de serviço: kebab-case
- Um componente por arquivo
- Props sempre tipadas com interface
- Hooks customizados: prefixo `use`
- Utilitários: funções puras, export nomeado

---

## REGRAS DE COMPORTAMENTO

Antes de qualquer mudança:
1. Explique o plano em 2-3 linhas
2. Liste os arquivos que serão afetados
3. Aguarde confirmação se a mudança for em área sensível (RLS, auth, tenant)
4. Implemente uma mudança por prompt
5. Liste como testar ao final
6. Sugira o commit

---

## ÁREAS SENSÍVEIS — NÃO ALTERAR SEM AVISO EXPLÍCITO

```
[x] Autenticação: src/contexts/auth, lib/supabase auth, Supabase Auth config
[x] Banco de dados: RLS policies, tenant_id isolamento, Supabase migrations
[x] Pagamentos: N/A (ainda)
[x] Permissões e roles: RLS policies, tenant-based access
[x] Integrações críticas: WhatsApp integration, Supabase realtime
[x] Variáveis de ambiente: .env, .env.production (nunca expor)
```

---

## NO-FLY ZONES

A IA **não decide sozinha** sobre:
- Segurança e criptografia
- Autenticação e autorização
- Pagamentos
- Schema de banco em produção
- Exclusão de dados
- Multi-tenancy (RLS, tenant_id, isolamento)
- Deploy em produção

Regra: **IA sugere. Humano aprova.**

---

## ESTADO ATUAL DO PROJETO

**Fase atual:** Produção
**Últimas mudanças:** Componentes UI em evolução, design system em construção
**Próximas tarefas:** Ver TODO.md
**Bugs conhecidos:** Ver BUGS.md

### Saúde Técnica (Fase 0 — 2026-05-10)

| Verificação | Status | Detalhe |
|---|---|---|
| Build | ✅ OK | `npm run build` passa |
| Lint | ⚠️ 428 warnings | 0 errors — principalmente `any` e `exhaustive-deps` |
| TypeScript | ✅ OK | strict mode ativo |
| .env no .gitignore | ✅ OK | .env, .env.local, .env.migration protegidos |
| Segredos expostos | ✅ OK | nenhum encontrado |
| Dependências | ✅ OK | npm audit limpo |

---

## LINKS E REFERÊNCIAS

| Recurso | Link |
|---|---|
| Repositório | https://github.com/grupototum/upixelcrm |
| Deploy | [URL produção — preencher] |
| Supabase | [URL projeto Supabase — preencher] |
| Design | [URL Figma ou N/A] |

---

## ARQUITETURA MULTI-TENANT

### Princípio
Cada cliente acessa via subdomínio: `cliente.upixel.com.br`
Isolamento via RLS no Supabase usando `tenant_id`.

### Fluxo de onboarding
1. Cliente acessa domínio raiz (`upixel.com.br`)
2. Preenche nome, subdomínio desejado, e-mail e senha
3. Sistema cria tenant e usuário automaticamente
4. Redirecionamento para `{subdomain}.upixel.com.br`

---

## VARIÁVEIS DE AMBIENTE

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ROOT_DOMAIN=localhost  # ou upixel.com.br em prod
```

---

## TESTE DE SUBDOMÍNIOS LOCALMENTE

Editar `/etc/hosts`:
```
127.0.0.1  localhost
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
```

---

## SKILLS E FERRAMENTAS

| Situação | Usar |
|---|---|
| Revisão antes de deploy | `skill-revisao-pre-producao.md` |
| Auditoria de limpeza | `skill-raio-x.md` |
| Debug de bug difícil | `skill-debug-profundo.md` |
| Eliminar código repetido | `skill-refatorador-dry.md` |
| Antes de commitar | `skill-revisor-commit.md` |
| Criar componente React | `skill-criador-componente.md` |
| Gerar testes | `skill-gerador-testes.md` |
| Revisar segurança | `skill-review-segurança.md` |

> Skills em: `VIBE CODING TOTUM SYSTEM/Skills para IAs/`

---

## REGRAS QUE NUNCA MUDAM (Totum Torah)

1. Sempre perguntar: **LP/Site | MVP | Teste | Produção?**
2. **Uma mudança por prompt**
3. **Testar antes de commitar**
4. **Documentar antes de mexer**
5. **IA sugere. Humano aprova** (em No-Fly Zones)
6. **Preservar o que funciona**
7. Prioridade: **Confiabilidade → Velocidade → Performance**

---

*CLAUDE.md v3.0 — uPixel CRM — Sistema Vibe Coding Totum — 2026-05-10*

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
