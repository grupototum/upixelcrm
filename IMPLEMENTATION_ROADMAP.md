# 📋 Plano de Ação - Gaps de Implementação uPixel CRM

**Data:** 29/04/2026  
**Status:** Planejamento (não aplicado ainda)  
**Implementação Geral:** 42% (33/79 features)

---

## **DIAGNÓSTICO GERAL**

| Área | Implementado | Parcial | Ausente | Prioridade Comercial |
|---|---|---|---|---|
| Core CRM | 75% | 25% | 0% | ✅ Sólido |
| Comunicação | 64% | 18% | 18% | ⚠️ Funcional |
| **Disparos** | **36%** | **29%** | **35%** | 🔥 **CRÍTICO** |
| Automações | 60% | 20% | 20% | ⚠️ Funcional |
| IA/Alexandria | 33% | 11% | 56% | 🔥 Alto valor |
| Analytics | 50% | 25% | 25% | ⚠️ Funcional |
| Integrações | 18% | 18% | 64% | 🔥 Diferencial |
| Plataforma | 0% | 0% | 100% | ⚠️ Compliance |

---

## **GAPS CRÍTICOS IDENTIFICADOS** ⚠️

### 🔴 **Bloqueadores de Receita (corrigir AGORA)**
1. **Disparos sem anti-bloqueio** → risco de banimento das contas WhatsApp dos clientes
2. **Sem detecção de opt-out** ("PARAR"/"CANCELAR") → violação de LGPD/CTIA
3. **Sem blocklist (DNC)** → mensagens para quem pediu para parar
4. **Email channel "coming_soon"** → falta canal essencial
5. **RBAC com apenas 3 roles** (faltam super_admin, gerente, operador, viewer)

### 🟡 **Diferenciais Comerciais (próxima onda)**
6. Sem A/B testing de campanhas
7. Sem listas dinâmicas (apenas snapshots estáticos)
8. Sem batch processing real (1000+ leads)
9. Sem nodes lógicos avançados em automações (IF/LOOP/DELAY visuais)
10. Sem AI Copilot / sugestões de resposta
11. Sem análise preditiva (churn, LTV, win probability)

### 🟢 **Compliance & Ecosystem (médio prazo)**
12. Sem GDPR/LGPD tooling (export/right-to-forget)
13. Sem Zapier/Make
14. Sem Stripe/MercadoPago
15. Sem SMS
16. Sem Slack/Discord webhooks

---

## **PLANO DE IMPLEMENTAÇÃO POR FASES**

### 🔥 **FASE 1 — Anti-Bloqueio & Compliance WhatsApp** (2 semanas)
> **Objetivo:** Proteger contas dos clientes contra banimento. Sem isso, o produto causa prejuízo ao cliente.

**Entregáveis:**
- [ ] Tabela `whatsapp_blocklist` (DNC) com triggers automáticos
- [ ] Listener de opt-out no webhook (`PARAR`, `CANCELAR`, `STOP`, `SAIR`, `DESCADASTRAR`)
- [ ] Auto-add ao blocklist + notificação ao admin
- [ ] Tabela `whatsapp_send_limits` por instância (msgs/dia, msgs/hora)
- [ ] Throttling com **intervalo aleatório** (jitter 30-90s entre msgs)
- [ ] Rotação de instâncias (round-robin entre múltiplas conexões)
- [ ] Pause/resume em campanhas (status `paused`)
- [ ] Pré-validação de blocklist antes do envio
- [ ] Footer obrigatório de opt-out em templates marketing

**Arquivos a criar/modificar:**
- `supabase/migrations/<data>_whatsapp_compliance.sql` (blocklist, send_limits)
- `supabase/functions/whatsapp-webhook/index.ts` (opt-out listener)
- `supabase/functions/broadcast-dispatch/index.ts` (throttling + rotation + blocklist check)
- `src/pages/WhatsAppBroadcastPage.tsx` (UI de pause/resume + blocklist)
- `src/pages/SettingsPage.tsx` (gestão de blocklist global)

**Critério de aceite:** Cliente envia 1000 msgs sem ban; opt-out automático; instâncias rotacionam.

---

### 🔥 **FASE 2 — Disparos Avançados** (3 semanas)
> **Objetivo:** Transformar disparos básicos em ferramenta de marketing premium.

**Entregáveis:**
- [ ] **Listas dinâmicas** (queries que reavaliam no momento do envio)
- [ ] **A/B Testing** (variantes A/B/C com split configurável + métricas)
- [ ] **Segmentação AND/OR** (UI de query builder com grupos aninhados)
- [ ] Campanhas **recorrentes** (cron schedule: diário, semanal, mensal)
- [ ] **Métricas completas**: delivery rate, read rate, reply rate, opt-out rate, CTR
- [ ] **Click tracking** com link shortener interno + UTM auto-injection
- [ ] **Preview** com lista de destinatários antes de disparar
- [ ] Detecção de números inválidos (auto-blacklist temporário)

**Arquivos a criar/modificar:**
- `supabase/migrations/<data>_dynamic_lists.sql` (segments table + evaluator)
- `supabase/migrations/<data>_ab_testing.sql` (campaign_variants table)
- `supabase/functions/link-shortener/index.ts` (tracking redirect)
- `src/components/campaigns/SegmentBuilder.tsx` (query builder visual)
- `src/components/campaigns/ABTestConfig.tsx`
- `src/pages/CampaignAnalyticsPage.tsx` (dashboard completo de métricas)

**Critério de aceite:** Campanha A/B com 3 variantes, lista dinâmica recalculada no envio, CTR rastreado.

---

### 🟡 **FASE 3 — Email Channel Completo** (2 semanas)
> **Objetivo:** Substituir "coming_soon" por canal email funcional (atualmente bloqueia 30% dos casos de uso).

**Entregáveis:**
- [ ] Configuração SMTP por tenant (host, port, user, pass, from)
- [ ] Suporte a SendGrid/Mailgun/SES via API
- [ ] Editor de email **drag-drop** (usar `react-email` ou `unlayer`)
- [ ] Templates HTML com preview multi-device
- [ ] **Open tracking** via pixel 1x1
- [ ] **Click tracking** via redirect com UTM
- [ ] **Bounce handling** (webhook de retorno + auto-blacklist)
- [ ] Unsubscribe link automático e funcional
- [ ] Edge Function `email-send` + queue similar ao WhatsApp

**Arquivos a criar:**
- `supabase/migrations/<data>_email_infrastructure.sql` (smtp_configs, email_queue, email_events)
- `supabase/functions/email-send/index.ts`
- `supabase/functions/email-track-open/index.ts`
- `supabase/functions/email-track-click/index.ts`
- `supabase/functions/email-bounce-webhook/index.ts`
- `src/components/email/EmailEditor.tsx`
- `src/pages/EmailCampaignPage.tsx`

**Critério de aceite:** Campanha email enviada via SMTP, com open/click rastreados e unsubscribe funcional.

---

### 🟡 **FASE 4 — Automation Builder Avançado** (3 semanas)
> **Objetivo:** Workflow builder de classe Kommo/HubSpot.

**Entregáveis:**
- [ ] **Nodes lógicos visuais**: IF/ELSE, LOOP, DELAY, WAIT_FOR_EVENT, SPLIT, MERGE
- [ ] **Nodes de integração**: HTTP request, webhook out, Supabase query
- [ ] **Test run real** (executa workflow com lead de teste e mostra path)
- [ ] **Batch processor** (processar 1000+ leads em chunks de 100)
- [ ] **Kommo Salesbot import/export** (parser JSON bidirecional)
- [ ] **Sentry-like execution viewer** (timeline de cada execução)
- [ ] **Variáveis customizadas** no fluxo (set/get scope local)
- [ ] **Status completo**: pending → running → completed/failed/paused

**Arquivos a modificar/criar:**
- `src/components/automations/nodes/{IfElse,Loop,Delay,WaitFor,HttpRequest}Node.tsx`
- `src/components/automations/TestRunModal.tsx`
- `src/lib/kommo/{importer,exporter}.ts`
- `supabase/functions/automation-batch-processor/index.ts`
- Migração: extensão de `automation_executions` com novos status

**Critério de aceite:** Importa Salesbot Kommo, executa em 5000 leads em batch, debug visual funciona.

---

### 🟢 **FASE 5 — RBAC Completo & Compliance** (1.5 semanas)
> **Objetivo:** LGPD/GDPR compliance + roles enterprise.

**Entregáveis:**
- [ ] Adicionar roles: `super_admin`, `gerente`, `operador`, `viewer`
- [ ] Matriz de permissões granulares por módulo
- [ ] **LGPD Data Export** (botão em SettingsPage que gera ZIP de todos dados do contato)
- [ ] **Right to Forget** (deletion workflow com confirmação)
- [ ] **Audit log viewer** (UI para revisar ações)
- [ ] **Soft delete** em leads/contatos/conversas (coluna `deleted_at`)
- [ ] Política de retenção configurável (7d, 30d, 90d, infinito)
- [ ] Termo de consentimento opt-in obrigatório

**Arquivos:**
- `supabase/migrations/<data>_rbac_expansion.sql`
- `supabase/migrations/<data>_soft_delete.sql`
- `supabase/functions/lgpd-export/index.ts`
- `supabase/functions/lgpd-delete/index.ts`
- `src/pages/AuditLogPage.tsx`
- `src/pages/PrivacyCenterPage.tsx`

**Critério de aceite:** Cliente consegue exportar todos dados de um contato, deletar permanentemente, e auditar ações.

---

### 🟢 **FASE 6 — IA Avançada & Copilot** (3 semanas)
> **Objetivo:** Diferenciador premium via IA contextual.

**Entregáveis:**
- [ ] **AI Reply Suggestions** no inbox (sugestão em tempo real durante conversa)
- [ ] **Conversation Summarization** (resumo automático de conversas longas)
- [ ] **Sentiment Analysis** (score por mensagem + alerta para sentiment negativo)
- [ ] **AI Copilot** (sidebar com next-action suggestions baseadas em contexto)
- [ ] **Auto-generated emails/proposals** (template + preencher com IA)
- [ ] **Personalização em massa com IA** (variações por lead em campanhas)
- [ ] Tracking de sugestões aceitas/rejeitadas (feedback loop)

**Arquivos:**
- `supabase/functions/ai-reply-suggest/index.ts`
- `supabase/functions/ai-summarize/index.ts`
- `supabase/functions/ai-sentiment/index.ts`
- `supabase/functions/ai-copilot/index.ts`
- `src/components/inbox/AIReplyPanel.tsx`
- `src/components/intelligence/CopilotSidebar.tsx`

**Critério de aceite:** Agente recebe sugestão de resposta em <2s, accept rate >40%.

---

### 🟢 **FASE 7 — Análise Preditiva** (2 semanas)
> **Objetivo:** Insights acionáveis via ML.

**Entregáveis:**
- [ ] **Churn Prediction** (modelo simples baseado em recency/frequency)
- [ ] **Win Probability** (score em deals baseado em features históricas)
- [ ] **Best Time to Contact** (análise de engajamento por dia/hora)
- [ ] **LTV calculation** (média móvel + projeção)
- [ ] **Lookalike audiences** (cosine similarity de features)
- [ ] **Anomaly detection** (alertas quando KPI cai >X%)
- [ ] Dashboard de Insights Preditivos

**Critério de aceite:** Dashboard prediz top-10 leads em risco de churn, top-10 deals com >70% win probability.

---

### 🟢 **FASE 8 — Integrações Ecosystem** (4 semanas - paralelo)
> **Objetivo:** Plug-and-play com ferramentas que clientes já usam.

**Entregáveis (em ordem de impacto):**
- [ ] **Zapier integration** (OAuth + triggers + actions)
- [ ] **Make.com integration** (similar)
- [ ] **Public REST API v1** (documentada com OpenAPI + rate limiting real)
- [ ] **Outgoing webhooks engine** (retry + signing)
- [ ] **Stripe** (pagamentos + assinaturas + webhook de status)
- [ ] **MercadoPago** (mesmo)
- [ ] **Google Calendar** (sync bidirecional de tarefas)
- [ ] **SMS** via Twilio/Zenvia
- [ ] **Slack/Discord webhooks** (notificações de eventos)
- [ ] **RD Station/HubSpot** sync (one-way primeiro)
- [ ] **Hotmart/Eduzz** (webhook receiver de vendas)
- [ ] **Google Sheets** export

**Arquivos:**
- `supabase/functions/integrations/{zapier,make,stripe,mercadopago,calendar,sms,slack,rdstation,hubspot,hotmart}/index.ts`
- `src/pages/IntegrationsPage.tsx` (substituir "coming_soon" por config UI)

**Critério de aceite:** Cliente conecta Zapier em 2 cliques e cria zap funcional.

---

### 🟢 **FASE 9 — Inbox UX & Recursos Faltantes** (2 semanas)
> **Objetivo:** Polir a experiência de atendimento.

**Entregáveis:**
- [ ] **Round-robin assignment** automático (com pesos e disponibilidade)
- [ ] **Typing indicators** (broadcast via Realtime)
- [ ] **Read receipts** (status `read_at` por mensagem)
- [ ] **Internal notes** thread-level (visíveis só para agentes)
- [ ] **Lead scoring** (engine de regras + recálculo automático)
- [ ] **Webchat widget embeddable** (script standalone para inserir em sites)
- [ ] **Meta Official: HSM templates UI** + **interactive buttons** + **catalog messages**
- [ ] **Facebook Messenger** integration

---

### 🟢 **FASE 10 — Plataforma & Branding** (1.5 semanas)
> **Objetivo:** White-label e branding por tenant.

**Entregáveis:**
- [ ] Branding por tenant (logo, cores primárias/secundárias, favicon)
- [ ] Custom domain support
- [ ] Custom email templates com branding
- [ ] **Reports schedule by email** (cron de relatórios)
- [ ] **Drilldown** em analytics (click em métrica → detalhes)
- [ ] **Custom reports drag-drop builder**
- [ ] **CSV/Excel/PDF export** real (atualmente apenas botões)
- [ ] **App Store** infrastructure (extensions hosted via tenant)

---

## **CRONOGRAMA RESUMIDO**

| Fase | Duração | Equipe | Início após |
|---|---|---|---|
| **F1: Anti-Bloqueio WhatsApp** 🔥 | 2 sem | 2 devs | Imediato |
| **F2: Disparos Avançados** 🔥 | 3 sem | 2 devs | F1 |
| **F3: Email Channel** | 2 sem | 1 dev | Paralelo F2 |
| **F4: Automation Builder** | 3 sem | 2 devs | F2 |
| **F5: RBAC + LGPD** | 1.5 sem | 1 dev | Paralelo F4 |
| **F6: IA Copilot** | 3 sem | 1 dev IA + 1 frontend | F4 |
| **F7: Análise Preditiva** | 2 sem | 1 dev IA | Paralelo F6 |
| **F8: Integrações** | 4 sem | 2 devs | Paralelo após F3 |
| **F9: Inbox UX** | 2 sem | 1 dev | F1 |
| **F10: Plataforma & Branding** | 1.5 sem | 1 dev | Final |

**Total sequencial mínimo:** ~14 semanas (3.5 meses)  
**Com paralelização (3-4 devs):** ~10 semanas (2.5 meses)

---

## **PRIORIZAÇÃO POR ROI**

| Prioridade | Fase | Impacto Comercial | Esforço |
|---|---|---|---|
| **P0 - Bloqueador** | F1 (Anti-bloqueio) | 🔴 Sem isso, clientes saem (banimento) | Baixo |
| **P0 - Receita** | F2 (Disparos avançados) | 💰 Permite cobrar tier premium | Médio |
| **P1 - Canal** | F3 (Email) | 💰 30% mais use cases | Médio |
| **P1 - Diferencial** | F4 (Automation+) | 💰 Justifica preço enterprise | Alto |
| **P1 - Compliance** | F5 (RBAC+LGPD) | 🛡️ Vendas enterprise/regulado | Baixo |
| **P2 - Premium** | F6 (IA Copilot) | 💎 Tier IA / upsell | Alto |
| **P2 - Premium** | F7 (Preditivo) | 💎 Tier IA | Médio |
| **P2 - Ecosystem** | F8 (Integrações) | 🔌 Reduz churn / amplia mercado | Alto |
| **P3 - Polish** | F9 (Inbox UX) | ✨ NPS / retenção | Médio |
| **P3 - White-label** | F10 (Branding) | 🏷️ Modelo agência/revenda | Baixo |

---

## **RECOMENDAÇÃO IMEDIATA**

**Começar AGORA por F1 (Anti-Bloqueio)** — é risco operacional ativo. A cada dia sem opt-out detection, há risco de banimento de clientes e perda de contas pagantes. Esforço de 2 semanas com 2 devs trava muito churn potencial.

---

## **DETALHES TÉCNICOS POR FASE**

### Referência de Implementação

**F1 - Schemas necessários:**
```sql
CREATE TABLE whatsapp_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  phone_number TEXT NOT NULL,
  reason TEXT, -- 'opt_out', 'invalid', 'complained'
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone_number)
);

CREATE TABLE whatsapp_send_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  instance_name TEXT NOT NULL,
  messages_per_day INTEGER DEFAULT 500,
  messages_per_hour INTEGER DEFAULT 50,
  current_day_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  last_reset_day TIMESTAMPTZ DEFAULT now(),
  last_reset_hour TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);
```

**F1 - Opt-out detection em webhook:**
```typescript
// Em whatsapp-webhook/index.ts
const optOutKeywords = ['parar', 'cancelar', 'stop', 'sair', 'descadastrar', 'remove', 'unsubscribe'];
if (optOutKeywords.some(kw => messageText.toLowerCase().includes(kw))) {
  // Add ao blocklist
  // Notify admin
}
```

---

## **NOTAS IMPORTANTES**

- Este plano assume 3-4 desenvolvedores em tempo integral
- Tamanho total de implementação: ~200-250 pontos de esforço (Fibonacci)
- Pode ser ajustado conforme prioridades de negócio mudarem
- Recomendado revisão a cada 2 semanas
- Manter rastreamento em issue tracker (GitHub/Linear/Jira)

---

**Última atualização:** 29/04/2026  
**Status:** Pronto para implementação (aguardando aprovação)
