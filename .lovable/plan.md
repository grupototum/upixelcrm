

## Plano: Aplicar Design System do ZIP com 98% de Fidelidade

### Contexto
O ZIP `Novo_upixel.zip` contém **14 módulos** com referências visuais em **dark e light mode**, cada um com `code.html` (código CSS/layout exato) e `screen.png` (screenshot de referência):

| Módulo | Pastas no ZIP |
|--------|--------------|
| Dashboard | `upixel_crm_dashboard_claro_laranja/`, `upixel_crm_dashboard_escuro_refined_color/` |
| CRM | `crm_dark_mode/`, `crm_light_mode/` |
| Inbox | `inbox_dark_mode/`, `inbox_light_mode/` |
| Tarefas | `tarefas_dark_mode/`, `tarefas_light_mode/` |
| Campanhas | `campanhas_dark_mode/`, `campanhas_light_mode/` |
| Automações | `automac_a_o_dark_mode_1/`, `automac_a_o_light_mode_1/` |
| Inteligência | `intelige_ncia_dark_mode/`, `intelige_ncia_light_mode/` |
| Relatórios | `relato_rios_dark_mode/`, `relato_rios_light_mode/` |
| Integrações | `integrac_o_es_dark_mode/`, `integrac_o_es_light_mode/` |
| Importação | `importac_a_o_dark_mode/`, `importac_a_o_light_mode/` |
| Usuários | `usua_rios_dark_mode/`, `usua_rios_light_mode/` |
| Nova Tela | `nova_tela_escuro/`, `nova_tela_claro/` |

### Abordagem

Dado o volume (14 módulos x 2 temas = 28 referências), o trabalho sera dividido em **fases incrementais**, cada uma atualizando 2-3 módulos para manter qualidade e evitar regressões.

---

### Fase 0 — Extração e Análise do Design System
1. Extrair o ZIP e renderizar cada `screen.png` para mapear o design exato
2. Analisar os `code.html` para extrair: paleta de cores (CSS variables), espaçamentos, border-radius, tipografia, sombras, e componentes visuais
3. Atualizar `src/index.css` (CSS variables) e `tailwind.config.ts` se o design system base divergir do atual

### Fase 1 — Layout Global + Dashboard
1. **AppSidebar** — ajustar proporções, ícones, hover states, footer conforme referência
2. **AppLayout Header** — ajustar altura, espaçamento, ícones
3. **DashboardPage** — replicar layout dos KPI cards, charts, pipeline summary e atividades recentes conforme screenshots

### Fase 2 — CRM + Inbox
1. **CRMPage** — Kanban columns, cards, barra de ferramentas
2. **InboxPage** — Lista de threads, área de chat, painel de contexto do lead

### Fase 3 — Tarefas + Campanhas + Relatórios
1. **TasksPage** — cards, filtros, progress header
2. **CampaignsPage** — layout de cards/tabelas
3. **ReportsPage** — charts e métricas

### Fase 4 — Automações + Inteligência + Restantes
1. **AutomationsPage** — tabs e cards
2. **IntelligencePage** — tabs e conteúdo
3. **IntegrationsPage**, **ImportPage**, **UsersPage**
4. **Nova Tela** — identificar e implementar a nova tela (se for um módulo novo)

### Fase 5 — Responsividade e QA Final
1. Testar cada módulo em desktop (1280px+) e mobile (375px)
2. Verificar consistência entre dark/light mode
3. Garantir que todas as funcionalidades existentes (CRUD de leads, tarefas, drag-and-drop, Supabase) continuem operando

---

### Detalhes Técnicos

**Arquivos potencialmente modificados:**
- `src/index.css` — CSS variables (cores, sombras, glass effects)
- `tailwind.config.ts` — tokens de design se necessário
- `src/components/layout/AppSidebar.tsx` — sidebar layout
- `src/components/layout/AppLayout.tsx` — header global
- Todas as 11+ páginas em `src/pages/`
- Componentes de UI em `src/components/` (crm, tasks, dashboard, inbox, etc.)

**Preservado intacto:**
- Backend Supabase (tabelas, RLS, queries)
- Estado global (`AppContext.tsx`)
- Lógica de negócio (CRUD, drag-and-drop, filtros)
- Rotas e navegação
- `src/integrations/supabase/client.ts` e `types.ts`

**Processo por módulo:**
1. Abrir `screen.png` da referência
2. Comparar com o estado atual do módulo
3. Extrair CSS exato do `code.html`
4. Aplicar mudanças mantendo componentes React e lógica
5. Verificar visualmente no preview

---

### Recomendação

Devido ao volume (28 referências visuais, 14+ arquivos), sugiro iniciar pela **Fase 0 + Fase 1** (design system base + Dashboard) para validar a direção visual antes de avançar para os demais módulos. Isso permite ajustes rápidos caso algum detalhe precise de refinamento.

