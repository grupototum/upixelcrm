# BUGS.md — Auditoria Caixa-Cinza upixelcrm

**Data:** 2026-05-11
**Método:** Análise estática do código (não executado em browser)
**Escopo:** 12 telas principais conforme map de auditoria

## Resumo Executivo

- Total de bugs encontrados: **34**
- 🔴 Críticos: **11**
- 🟡 Médios: **14**
- 🟢 Leves: **9**

| Tela | 🔴 | 🟡 | 🟢 |
|---|---|---|---|
| Login | 0 | 1 | 1 |
| Cadastro (Signup) | 2 | 1 | 0 |
| Dashboard | 0 | 2 | 1 |
| Inbox | 0 | 1 | 1 |
| WhatsApp Config/Instâncias | 0 | 1 | 1 |
| WhatsApp Disparos | 2 | 2 | 0 |
| CRM Leads (Contatos) | 1 | 2 | 1 |
| CRM Pipeline | 0 | 1 | 0 |
| Automações Visual Builder | 2 | 1 | 1 |
| Configurações Integrações | 1 | 1 | 1 |
| Perfil/Tenant/Segurança | 3 | 1 | 1 |
| Relatórios | 0 | 0 | 1 |

## Ordem Recomendada de Correção

1. **BUG-001** — Senha de gate de cadastro hardcoded no bundle do cliente.
2. **BUG-002** — SecurityPage inteira é mock (campos não-controlados, botões sem handler).
3. **BUG-003** — Botão "Excluir Conta" do ProfilePage sem handler.
4. **BUG-004** — Botão "Atualizar Senha" sem handler e sem state binding.
5. **BUG-005** — `handleCreate` em AutomationsPage só faz toast "Demonstração" para 3 das 5 abas.
6. **BUG-006** — Botão "Testar Fluxo" do AutomationBuilder sem onClick.
7. **BUG-007** — Botões "Acessar Central de Ajuda" e "Configurar Webhook" no BroadcastPage sem handler.
8. **BUG-008** — Aba "Histórico" do BroadcastPage é placeholder estático.
9. **BUG-009** — Switch de integrações só dispara toast informativo (não ativa/desativa).
10. **BUG-010** — BotBuilderPage trava em loading se `id` undefined.
11. **BUG-011** — Deleção de contatos sem confirmação.

---

## Bugs por Severidade

### 🔴 CRÍTICOS

#### BUG-001 — Senha de gate de cadastro hardcoded no bundle
- **Tela:** Cadastro
- **Arquivo:** `src/pages/SignupPage.tsx:11`
- **Fluxo:** Acesso a `/cadastro` exige senha; o fallback `"Master123!"` está no código do client.
- **Esperado:** Variável obrigatória `VITE_SIGNUP_PASSWORD` sem fallback, ou validação server-side.
- **Obtido:** `const SIGNUP_PASSWORD = import.meta.env.VITE_SIGNUP_PASSWORD ?? "Master123!"` — vazado no bundle.
- **Evidência:** linha 11.
- **Sugestão de fix:** remover fallback, validar a senha em edge function.

#### BUG-002 — SecurityPage inteira é mock visual sem persistência
- **Tela:** Configurações → Segurança
- **Arquivo:** `src/pages/SecurityPage.tsx:11-164`
- **Fluxo:** Usuário tenta trocar senha, ativar 2FA ou encerrar sessões.
- **Esperado:** Funcionalidade real ligada ao Supabase Auth.
- **Obtido:** Inputs de senha sem `value`/`onChange`, switch 2FA com `checked={false}` fixo, botão "Atualizar Senha" sem `onClick`, "Sair de todas as sessões" sem handler, lista de dispositivos hardcoded (`Chrome no Windows 11 · São Paulo`, etc.).
- **Evidência:** linhas 42, 55, 82–93, 107, 112–130.
- **Sugestão de fix:** colocar Coming Soon banner OU implementar chamadas a `supabase.auth.updateUser` / `signOut`.

#### BUG-003 — "Excluir Conta" sem handler
- **Tela:** Configurações → Perfil
- **Arquivo:** `src/pages/ProfilePage.tsx:142`
- **Fluxo:** Usuário clica em "Excluir Conta" na Zona de Perigo.
- **Esperado:** Modal de confirmação + chamada de exclusão server-side.
- **Obtido:** `<Button ...>Excluir Conta</Button>` sem `onClick`.
- **Sugestão de fix:** abrir AlertDialog + RPC de soft-delete.

#### BUG-004 — "Atualizar Senha" sem state nem handler
- **Tela:** Configurações → Segurança
- **Arquivo:** `src/pages/SecurityPage.tsx:93`
- **Esperado:** valida senha atual, atualiza nova via `supabase.auth.updateUser`.
- **Obtido:** botão sem `onClick`; inputs não controlados.
- **Sugestão de fix:** transformar em form controlado + handler real.

#### BUG-005 — AutomationsPage cria automação fake em 3 abas
- **Tela:** Automações
- **Arquivo:** `src/pages/AutomationsPage.tsx:32-54`
- **Fluxo:** Usuário clica "Nova Sequência" / "Novo Bot" / "Novo Fluxo".
- **Esperado:** abrir modal/builder correspondente.
- **Obtido:** `toast.success("... criada com sucesso! (Demonstração)")` — nada criado.
- **Sugestão de fix:** rotear para `/automations/builder/novo`, `/bots/novo`, ou abrir modal específico.

#### BUG-006 — "Testar Fluxo" sem handler no Automation Builder
- **Tela:** Automações → Builder
- **Arquivo:** `src/pages/AutomationBuilderPage.tsx:69-72`
- **Esperado:** dispara execução do fluxo em modo dry-run.
- **Obtido:** `<Button ...>Testar Fluxo</Button>` sem `onClick`.
- **Sugestão de fix:** ocultar o botão até implementar OU adicionar handler que chame edge function de simulação.

#### BUG-007 — Botões "Central de Ajuda" e "Configurar Webhook" mortos
- **Tela:** WhatsApp Disparos
- **Arquivo:** `src/pages/WhatsAppBroadcastPage.tsx:86,105`
- **Esperado:** abrir help center e modal de webhook do Typebot.
- **Obtido:** dois `<button>` sem `onClick`.
- **Sugestão de fix:** remover ou adicionar `onClick={() => window.open(...)}` / `setWebhookModalOpen(true)`.

#### BUG-008 — Aba "Histórico" do BroadcastPage é placeholder estático
- **Tela:** WhatsApp Disparos
- **Arquivo:** `src/pages/WhatsAppBroadcastPage.tsx:118-130`
- **Esperado:** lista de envios passados com status de entrega.
- **Obtido:** card decorativo "Os relatórios... serão exibidos aqui conforme os envios forem processados." — nunca preenchido.
- **Sugestão de fix:** adicionar query a `broadcast_jobs` ou marcar com `<ComingSoonBadge />`.

#### BUG-009 — Switch de Integrações não faz toggle real
- **Tela:** Configurações → Integrações
- **Arquivo:** `src/pages/IntegrationsPage.tsx:92-96`
- **Fluxo:** Usuário desliga toggle do WhatsApp/Instagram/etc.
- **Esperado:** desativa integração no banco.
- **Obtido:** `handleToggle` apenas chama `toast.info("Acesse as configurações...")` — switch volta para o estado anterior visualmente confuso.
- **Sugestão de fix:** ou desabilitar o switch (`disabled`) ou implementar update na tabela `integrations`.

#### BUG-010 — BotBuilderPage trava em loading se `id` ausente
- **Tela:** Automações → Bot Builder
- **Arquivo:** `src/pages/BotBuilderPage.tsx:159-170`
- **Fluxo:** Acesso direto a `/bots/` sem id, ou id inválido sem registro.
- **Esperado:** redirect ou tela de erro.
- **Obtido:** `if (!id) return;` dentro do effect — `loading` nunca vira `false` se id é undefined → spinner infinito.
- **Sugestão de fix:** `if (!id) { navigate('/automations?tab=bots'); return; }` antes do effect ou setar `loading=false`.

#### BUG-011 — Deleção de contato sem confirmação ✅ RESOLVIDO (AlertDialog já implementado)
- **Tela:** CRM → Contatos
- **Arquivo:** `src/pages/ContactsPage.tsx:51-58, 151-153`
- **Fluxo:** Item "Excluir" do dropdown chama `deleteLead` diretamente.
- **Esperado:** AlertDialog de confirmação (operação destrutiva).
- **Obtido:** `onClick={() => handleDelete(contact.id)}` sem confirm.
- **Sugestão de fix:** envolver com AlertDialog (padrão já usado no CRMPage).

---

### 🟡 MÉDIOS

#### BUG-012 — Navigate durante render no LoginPage ✅ RESOLVIDO (2026-06-19)
- **Tela:** Login
- **Arquivo:** `src/pages/LoginPage.tsx:22-25`
- **Obtido:** `if (isAuthenticated) { navigate("/", ...); return null; }` chamado no corpo do componente → warning React "Cannot update during render".
- **Sugestão de fix:** mover para `useEffect`.

#### BUG-013 — `catch {}` engole erro original no signup ✅ RESOLVIDO (2026-06-19)
- **Tela:** Cadastro
- **Arquivo:** `src/pages/SignupPage.tsx:162-169`
- **Obtido:** `catch { ... setError("Erro inesperado..."); }` sem `(e)` nem log; depuração impossível em produção.
- **Sugestão de fix:** `catch (e) { logger.error(e); ... }`.

#### BUG-014 — Loading fake com `setTimeout` no CRM/Contacts ✅ RESOLVIDO (2026-06-19)
- **Tela:** CRM Pipeline / Contatos
- **Arquivos:** `src/pages/CRMPage.tsx:95-98`, `src/pages/ContactsPage.tsx:31-34`
- **Obtido:** `setTimeout(() => setIsLoading(false), 600)` — skeleton fake mesmo quando dados já estão carregados pelo `AppContext`.
- **Sugestão de fix:** usar `loading` do `useAppState`.

#### BUG-015 — Tarefas Pendentes sem empty state no Dashboard
- **Tela:** Dashboard
- **Arquivo:** `src/pages/DashboardPage.tsx:218-238`
- **Obtido:** quando não há tasks pendentes, o `space-y-2` fica vazio (só o header "0 pendentes").
- **Sugestão de fix:** adicionar `else <p>Nenhuma tarefa pendente</p>`.

#### BUG-016 — `due_date` exibido cru ✅ RESOLVIDO (2026-06-18)
- **Tela:** Dashboard
- **Arquivo:** `src/pages/DashboardPage.tsx:233`
- **Obtido:** `{task.due_date}` impresso como string ISO, sem formatação.
- **Sugestão de fix:** `format(new Date(task.due_date), 'dd/MM')`.

#### BUG-017 — "Salvar contato" do Inbox só toast
- **Tela:** Inbox (mensagens tipo contact)
- **Arquivo:** `src/pages/InboxPage.tsx:606`
- **Obtido:** botão `+` em vCard → `toast.info("Função de salvar contato em breve")`.
- **Sugestão de fix:** transformar em ação real (criar lead) ou esconder o botão.

#### BUG-018 — WhatsApp advanced modal sem aria-pressed nos tipos
- **Tela:** WhatsApp Configurações (modo avançado)
- **Arquivo:** `src/pages/WhatsAppPage.tsx:628-634`
- **Obtido:** botões "QR Code" / "API Oficial" sem `aria-pressed` / role explícito.
- **Sugestão de fix:** adicionar `aria-pressed={advancedType === t}`.

#### BUG-019 — "API Meta Status: Operacional" hardcoded
- **Tela:** WhatsApp Disparos
- **Arquivo:** `src/pages/WhatsAppBroadcastPage.tsx:36-41`
- **Obtido:** status mostrado é sempre verde/Operacional — não reflete realidade.
- **Sugestão de fix:** ler de `useBroadcast()` ou de health check.

#### BUG-020 — Rate Card "Brasil" hardcoded
- **Tela:** WhatsApp Disparos
- **Arquivo:** `src/pages/WhatsAppBroadcastPage.tsx:70`
- **Obtido:** "Rate Card: Brasil" estático; sem locale do tenant.
- **Sugestão de fix:** ler do perfil/tenant.

#### BUG-021 — Botão da câmera no avatar sem handler ✅ RESOLVIDO (2026-06-19)
- **Tela:** Perfil
- **Arquivo:** `src/pages/ProfilePage.tsx:54-56`
- **Obtido:** botão de câmera sobre avatar sem `onClick` — usuário tenta trocar foto e nada acontece.
- **Sugestão de fix:** abrir input file ou esconder botão.

#### BUG-022 — Atalhos "Notificações" e "Idioma e Região" sem onClick ✅ RESOLVIDO (removidos)
- **Tela:** Perfil
- **Arquivo:** `src/pages/ProfilePage.tsx:70-75`
- **Obtido:** dois itens de menu lateral sem handler — UX confusa.
- **Sugestão de fix:** rotear para anchors da própria página ou esconder.

#### BUG-023 — `setProjectId` dead state ✅ RESOLVIDO (2026-06-19)
- **Tela:** Integrações
- **Arquivo:** `src/pages/IntegrationsPage.tsx:51,82`
- **Obtido:** `projectId` é setado mas nunca lido no JSX.
- **Sugestão de fix:** remover ou usar.

#### BUG-024 — CRMPage `deleteLead` chamado sem confirmação em alguns pontos ✅ RESOLVIDO (BulkActionsBar e InboxPage têm AlertDialog)
- **Tela:** CRM Pipeline
- **Arquivo:** `src/pages/CRMPage.tsx:62`
- **Obtido:** `deleteLead` destruturado e passado adiante; cards do Kanban podem chamar destrutivo sem AlertDialog em todos os pontos (verificar `KanbanColumn`/`SortableLeadCard`).
- **Sugestão de fix:** envolver via wrapper que sempre pede confirmação.

#### BUG-025 — "Nova Tarefa" do LeadProfile sem validação de data ✅ RESOLVIDO (2026-06-19)
- **Tela:** Perfil do Lead
- **Arquivo:** `src/pages/LeadProfilePage.tsx:651-653`
- **Obtido:** input `type=date` sem `min` — aceita datas passadas.
- **Sugestão de fix:** `min={today}` no input.

---

### 🟢 LEVES

#### BUG-026 — Show/hide password sem aria-label ✅ RESOLVIDO (2026-06-18)
- **Tela:** Login
- **Arquivo:** `src/pages/LoginPage.tsx:94-102`
- **Sugestão de fix:** `aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}`.

#### BUG-027 — Pluralização errada "integraçãoões" ✅ RESOLVIDO (2026-06-18)
- **Tela:** Integrações
- **Arquivo:** `src/pages/IntegrationsPage.tsx:125`
- **Obtido:** `integração{activeCount !== 1 ? "ões" : ""} ativa{activeCount !== 1 ? "s" : ""}` → quando há mais de 1 fica "integraçãoões".
- **Sugestão de fix:** trocar por `{activeCount !== 1 ? "integrações ativas" : "integração ativa"}`.

#### BUG-028 — ChevronRight redefinido localmente ✅ RESOLVIDO (2026-06-18)
- **Tela:** CRM Contatos
- **Arquivo:** `src/pages/ContactsPage.tsx:210-227`
- **Obtido:** função `ChevronRight` redefinida apesar de `lucide-react` já fornecer o ícone.
- **Sugestão de fix:** `import { ChevronRight } from 'lucide-react'`.

#### BUG-029 — `Index.tsx` placeholder do Lovable abandonado ✅ RESOLVIDO (já deletado)
- **Tela:** —
- **Arquivo:** `src/pages/Index.tsx`
- **Obtido:** arquivo inteiro é placeholder ("IMPORTANT: Fully REPLACE this") com `<img src="/placeholder.svg" />`. Não está roteado, mas confunde manutenção.
- **Sugestão de fix:** deletar.

#### BUG-030 — Dead code em BotBuilderPage ✅ RESOLVIDO (2026-06-19)
- **Tela:** Bot Builder
- **Arquivo:** `src/pages/BotBuilderPage.tsx:21-70`
- **Obtido:** componente `BuilderInner` definido e nunca usado; `void handleSave; void handleToggle` para silenciar lint.
- **Sugestão de fix:** remover.

#### BUG-031 — Emoji decorativo em produção ✅ RESOLVIDO (2026-06-18)
- **Tela:** WhatsApp Disparos
- **Arquivo:** `src/pages/WhatsAppBroadcastPage.tsx:28`
- **Obtido:** título "Aumente seu ROI com Envios Oficiais 🚀". CLAUDE.md proíbe emojis nesta base.
- **Sugestão de fix:** remover emoji.

#### BUG-032 — Texto "Em breve" misturado a feature ativa no LeadProfile
- **Tela:** Lead Profile → Automações
- **Arquivo:** `src/pages/LeadProfilePage.tsx:632-635`
- **Obtido:** banner "Automações avançadas em breve" abaixo da lista funcional confunde o usuário.
- **Sugestão de fix:** colocar em accordion ou seção separada.

#### BUG-033 — Subtítulo dos KPIs no Dashboard inconsistente com 0 leads ✅ RESOLVIDO (2026-06-19)
- **Tela:** Dashboard
- **Arquivo:** `src/pages/DashboardPage.tsx:50-51`
- **Obtido:** `"—"` aparece quando não há leads; inconsistente entre cards (alguns mostram `0 últimos 30d`).
- **Sugestão de fix:** padronizar para "0%".

#### BUG-034 — `formatRelativeTime` aceita datas futuras silenciosamente ✅ RESOLVIDO (2026-06-19)
- **Tela:** Dashboard
- **Arquivo:** `src/pages/DashboardPage.tsx:245-254`
- **Obtido:** Se `diff` for negativo (data futura), cai em "Agora" sem tratamento.
- **Sugestão de fix:** `if (minutes < 0) return "Agendado"`.

---

## Telas auditadas sem bugs significativos

- **IntelligencePage** — apenas roteador de abas para componentes (`AssistantTab`, `AgentsTab`, `KnowledgeBaseTab`). Lógica nos componentes filhos (não auditados em profundidade).
- **ReportsPage** — fluxos OK; abas "Avançado" são explicitamente Coming Soon documentado.

## Telas não auditadas em profundidade (delegam para componentes)

- `InboxPage.tsx` (1365 linhas) — auditado parcialmente; lógica de envio vive em hooks/components de `src/components/inbox/`.
- `UsersPage.tsx` (845 linhas) — auditado parcialmente; permissões/audit log usam Supabase corretamente.
- `LandingPage.tsx` e `LandingPageEN.tsx` — fora do escopo (LP institucional).
- Componentes em `src/components/automations/canvas/`, `src/components/bots/`, `src/components/whatsapp/broadcast/` — lógica delegada não revisada.

---

*Auditoria gerada por análise estática. Recomenda-se validar BUG-002, BUG-003, BUG-004 com QA manual antes de publicar correções.*

---
---

# PARTE 2 — Auditoria RUNTIME (caixa-preta real)

**Data:** 2026-05-11
**Método:** Navegação real em `https://master.upixel.app/` via Chrome MCP, usuário logado como **Master uPixel** (tenant Totum), 5690 leads reais no banco.
**Foco:** Validar bugs do audit estático em produção + capturar bugs visuais/runtime que código estático não revela.

## Resumo Executivo Runtime

- **32 bugs novos** identificados em runtime
- 🔴 Críticos: **11**
- 🟡 Médios: **15**
- 🟢 Leves: **6**
- **Bugs estáticos CONFIRMADOS em runtime:** BUG-002, BUG-003, BUG-005 (com agravante)

| Tela | 🔴 | 🟡 | 🟢 |
|---|---|---|---|
| Dashboard | 2 | 2 | 0 |
| Rota /dashboard (404) | 0 | 1 | 1 |
| Inbox | 0 | 2 | 1 |
| WhatsApp Config/Instâncias | 0 | 1 | 0 |
| WhatsApp Disparos | 2 | 3 | 0 |
| CRM Pipeline | 0 | 1 | 0 |
| Automações | 1 | 2 | 2 |
| Users | 0 | 1 | 1 |
| Reports | 2 | 1 | 0 |
| Landing / Signup / Login | 4 | 1 | 0 |

## Top 5 críticos a tratar IMEDIATAMENTE

1. **R-030** — TODOS os CTAs da landing (Teste grátis, Começar agora, Assinar o Pro) são botões mortos. **Conversão de novos clientes = 0** pela LP.
2. **R-028 / R-029** — `/signup` e `/login` no domínio raiz retornam landing page. Não existe fluxo de cadastro acessível.
3. **R-017** — "Nova Automação" persiste automação fantasma no banco com nome "Nova Automação N", sem wizard, sem nome. (Pior que BUG-005 estático: é write real.)
4. **R-011 / R-012** — Página de Disparos exibe dados fake hardcoded (12.450 enviados, R$ 450/mês, campanhas "Black Friday CONCLUÍDO") enquanto saldo real é 0. Usuário tem percepção falsa de uso.
5. **R-001** — Dashboard puxa TODOS os 5000+ leads paginados via `select=*` (8MB+ por carregamento), com chamadas duplicadas. Vai derreter tenants grandes.

## Atenção operacional

> Durante a navegação foi criada uma automação fantasma **"Nova Automação 91"** no tenant Totum como evidência viva do bug R-017. **Por favor apagar manualmente** após validar o bug (ou aceitar como evidência do problema).

---

## Runtime bugs detalhados

### 🔴 CRÍTICOS

#### R-001 — Dashboard carrega TODOS os leads no client
- **Tela:** Dashboard (`/`)
- **Evidência runtime:** 8 chamadas `GET /rest/v1/leads?select=*&order=created_at.desc&offset=0..7000&limit=1000`
- **Esperado:** Dashboard agrega via RPC ou view materializada no Postgres
- **Obtido:** Cliente baixa 8MB+ de leads em texto puro para calcular KPIs no navegador
- **Severidade:** 🔴
- **Fix sugerido:** Criar uma RPC `dashboard_kpis(client_id)` que retorne só os números agregados

#### R-002 — Chamadas duplicadas no Dashboard
- **Tela:** Dashboard (`/`)
- **Evidência:** Offsets 5000/6000/7000 disparados duas vezes na mesma carga
- **Obtido:** Largura de banda duplicada sem cache
- **Severidade:** 🔴
- **Fix sugerido:** TanStack Query `staleTime` + investigar `useEffect` rodando 2x em StrictMode

#### R-011 — Dados fake em Disparos (KPIs)
- **Tela:** WhatsApp Disparos (`/whatsapp/broadcast`)
- **Esperado:** Cards refletem dados reais do tenant
- **Obtido:** "TOTAL ENVIADO 12,450", "CUSTO MENSAL R$ 450,00", "USO MÉDIO 415 msg/dia", variações "+12%", "-5%" todos hardcoded. Saldo real do tenant: 0.
- **Severidade:** 🔴 (usuário pensa que tem histórico que não existe)

#### R-012 — Histórico de disparos fake
- **Tela:** WhatsApp Disparos (`/whatsapp/broadcast`) → "HISTÓRICO DE DISPAROS"
- **Obtido:** Lista hardcoded: "Promocional Black Friday CONCLUÍDO 500 cred Ontem", "Aviso de Vencimento EM ANDAMENTO", "Recuperação de Carrinho CONCLUÍDO"
- **Severidade:** 🔴

#### R-017 — "Nova Automação" cria automação fantasma sem wizard
- **Tela:** Automações (`/automations`)
- **Fluxo:** Clicar no botão **"Nova Automação"**
- **Esperado:** Abrir wizard/modal pedindo nome, gatilho, ação
- **Obtido:** Cria automação direto no banco com nome genérico "Nova Automação N" (N = sequencial), gatilho "Entrada no card" padrão e ação "Adicionar tag" padrão. Sem confirmação. Sem desfazer.
- **Evidência:** Acabei de criar acidentalmente "Nova Automação 91" no tenant durante o teste. A lista já tem **6 automações** com nomes genéricos ("Nova Automação 32/74/76/81/91" + variantes), todas confirmando que outros usuários caíram no mesmo bug.
- **Severidade:** 🔴

#### R-025 — KPIs de Relatórios com variações inventadas
- **Tela:** Reports (`/reports`)
- **Esperado:** Variação calculada vs período anterior
- **Obtido:** "Taxa de Conversão: 0% (+3.2%)", "Leads Totais: 0 (+12%)", "Ticket Médio: R$ 0 (-2.1%)" — variações estáticas em métricas zeradas. Matematicamente impossível.
- **Severidade:** 🔴

#### R-026 — Funil de Reports mostra 0 leads (tenant tem 5690)
- **Tela:** Reports (`/reports`)
- **Esperado:** Funil reflete leads reais distribuídos nos estágios
- **Obtido:** Todos os 7 estágios mostram "0 leads / 0%". Dashboard simultaneamente mostra 5000 leads em andamento.
- **Severidade:** 🔴 (relatório totalmente desconectado da fonte de verdade)

#### R-028 — `/signup` no domínio raiz retorna landing
- **Tela:** `https://upixel.app/signup`
- **Esperado:** Formulário de cadastro
- **Obtido:** Landing page (mesma de `/`)
- **Severidade:** 🔴

#### R-029 — `/login` no domínio raiz retorna landing
- **Tela:** `https://upixel.app/login`
- **Obtido:** Landing page
- **Severidade:** 🔴

#### R-030 — TODOS os CTAs da landing são botões mortos
- **Tela:** `https://upixel.app/`
- **Fluxo:** Clicar em qualquer um destes botões: "Teste grátis →" (header), "🔥 Teste grátis!" (hero), "Ver demonstração →", "🔥 Começar agora →" (footer), "Assinar o Pro →" (planos)
- **Esperado:** Abrir modal de cadastro / navegar pra `/signup` / abrir link
- **Obtido:** Nada. Click registrado, sem navegação, sem modal, sem toast, sem console error.
- **Severidade:** 🔴🔴 — **bloqueio total de aquisição via LP**

#### R-031 — Placeholder de instruções de design em produção
- **Tela:** `https://upixel.app/` (landing)
- **Obtido:** Texto **"Substituir por print do sistema"** aparece **7+ vezes** ao longo da página, no lugar de screenshots reais do produto
- **Severidade:** 🔴 (credibilidade)

---

### 🟡 MÉDIOS

#### R-003 — `profiles` puxado 3x consecutivas com o mesmo ID
- **Tela:** Dashboard
- **Obtido:** `GET /rest/v1/profiles?select=*&id=eq.<uuid>` repetido 3 vezes na carga inicial
- **Severidade:** 🟡

#### R-004 — `tasks?limit=5000` carregado no Dashboard
- **Tela:** Dashboard
- **Obtido:** Mesmo padrão N+1 / fetch-all do R-001 para tasks
- **Severidade:** 🟡

#### R-005 — `/dashboard` retorna 404 ✅ RESOLVIDO (2026-06-18)
- **Tela:** rota `/dashboard`
- **Esperado:** Mesma tela do Dashboard (`/`)
- **Obtido:** Página 404 ("Oops! Page not found")
- **Severidade:** 🟡 (URL bookmarcável esperada quebrada)

#### R-007 — Botão "Em breve" no toolbar do Inbox ✅ RESOLVIDO (2026-06-19)
- **Tela:** Inbox → painel de resposta
- **Obtido:** Botão literalmente rotulado "Em breve", sem feedback ao clique
- **Severidade:** 🟡

#### R-008 — "USAR IA" sem feedback
- **Tela:** Inbox → painel de resposta
- **Fluxo:** Clicar "USAR IA" com textarea vazio
- **Obtido:** Nenhum toast/aviso/loading. Usuário não sabe se o botão funcionou
- **Severidade:** 🟡

#### R-010 — Contador "1 número conectado" inconsistente
- **Tela:** WhatsApp Config (`/whatsapp`)
- **Obtido:** Header diz "1 número conectado" mas a lista tem 2 cards (um conectado, um desconectado)
- **Severidade:** 🟡

#### R-013 — Badge "SOON" exposto na ACESSAR CENTRAL DE AJUDA
- **Tela:** Disparos
- **Severidade:** 🟡

#### R-014 — "STATUS DE IMPLEMENTAÇÃO (ADMIN)" visível pra usuário comum
- **Tela:** Disparos
- **Obtido:** Seção rotulada (ADMIN) renderizada para usuário Master (e provavelmente outros). Conteúdo de dev exposto.
- **Severidade:** 🟡

#### R-015 — "API META STATUS — Operacional" hardcoded
- **Tela:** Disparos
- **Obtido:** Status estático "Operacional" sem chamada de health-check à Meta API
- **Severidade:** 🟡

#### R-016 — CRM defaults pra pipeline vazio
- **Tela:** CRM (`/crm`)
- **Obtido:** Pipeline "Atendimento" carregada por padrão com 0 leads, enquanto outros pipelines do tenant têm 5690 leads. Sem dica visual de que há mais pipelines com dados.
- **Severidade:** 🟡

#### R-019 — Aba "Bots" rotulada "Em breve" em produção
- **Tela:** Automações
- **Severidade:** 🟡

#### R-020 — Automações "Boas-vindas em Novo Lead" e "Parabéns em Fechado Ganho" listam GATILHO/AÇÕES vazios
- **Tela:** Automações
- **Obtido:** Cards renderizam labels "GATILHO" e "AÇÕES" sem valores
- **Severidade:** 🟡 (template não populado ou bug de render)

#### R-023 — Potencial vazamento cross-tenant em `/users`
- **Tela:** Users (`/users`)
- **Obtido:** Lista exibe 11 usuários de **4 empresas distintas** (Totum, Derma Clínica, teste, Test Corp). Aceitável SE rota for estritamente master-only protegida via RLS no server.
- **Risco:** Se um usuário não-master conseguir acessar `/users`, vê e potencialmente bloqueia/deleta usuários de outros tenants.
- **Severidade:** 🟡 → 🔴 se RLS não estiver no server
- **Verificar:** RLS policies em `auth.users` / `profiles` quando role != 'master'

#### R-027 — Aba "Avançado — Em breve" em Reports
- **Tela:** Reports
- **Severidade:** 🟡

#### R-032 — Copy "Seu período de teste acabou" pra visitante deslogado ✅ RESOLVIDO (copy removido)
- **Tela:** Landing
- **Obtido:** Texto na seção PLANOS afirma "Seu período de teste acabou, mas seus leads não esperam!" — exibido para visitante sem cookie, sem trial, sem conta
- **Severidade:** 🟡

---

### 🟢 LEVES

#### R-006 — Página 404 em inglês ✅ RESOLVIDO (2026-06-18)
- **Tela:** rota inexistente
- **Obtido:** "Oops! Page not found", "Return to Home" enquanto resto do app é PT-BR
- **Severidade:** 🟢

#### R-009 — Botões sem aria-label no Inbox
- **Tela:** Inbox
- **Obtido:** ~16 botões (cards de conversa, ícones do header e do toolbar) sem `aria-label`
- **Severidade:** 🟢

#### R-018 — Typo "11 automaçãoões" ✅ RESOLVIDO (pluralização correta no código atual)
- **Tela:** Automações (cabeçalho da contagem)
- **Obtido:** Sufixo duplicado: "automaç**ãoões**"
- **Severidade:** 🟢

#### R-021 — Múltiplas "Nova Automação 32/74/76/81" no banco
- **Tela:** Automações
- **Obtido:** Sintoma de outros usuários (Master, Vinicius, etc.) caindo no R-017 e abandonando automações genéricas
- **Severidade:** 🟢 (efeito; causa em R-017)

#### R-022 — "Atalhos" e "Ativar notificações" sem botão correspondente
- **Tela:** Perfil
- **Obtido:** Aparecem como texto visível mas não estão no DOM como elemento clicável
- **Severidade:** 🟢

#### R-024 — "Demo uPixel" duplicado em Users
- **Tela:** Users
- **Obtido:** Dois cadastros: `ola@upixel.app` + `demo@upixel.com.br`, ambos com nome "Demo uPixel"
- **Severidade:** 🟢

---

## Bugs estáticos CONFIRMADOS em runtime

| ID estático | Confirmação em runtime |
|---|---|
| **BUG-002** (SecurityPage mock) | ✅ Dispositivos hardcoded "Chrome no Windows 11 - SP / iPhone 15 Pro / Safari MacBook Pro - RJ" mostrados mesmo no Browser 1 macOS. |
| **BUG-003** (Excluir Conta sem handler) | ✅ Texto "Excluir Conta" aparece no DOM mas não como `button` interativo. |
| **BUG-005** (Nova Automação fake) | ✅ Pior que o esperado: não é só toast "Demonstração" — escreve no banco. Ver R-017. |

## Bugs estáticos NÃO validados em runtime

BUG-001 (senha hardcoded), BUG-004 (Atualizar Senha sem handler), BUG-006 (Testar Fluxo), BUG-007 (Acessar Central de Ajuda / Configurar Webhook handlers), BUG-008 (Histórico aba placeholder), BUG-009 (switches só toast), BUG-010 (BotBuilder loading), BUG-011 (delete sem confirm) — não testados a fundo no runtime, mas continuam válidos via leitura de código.

---

*Auditoria runtime executada em 2026-05-11 via Chrome MCP no tenant `master`. Aviso operacional acima sobre "Nova Automação 91" criada como evidência.*
