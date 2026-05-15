# Checklist de Integrações — Meta + Google

**Objetivo:** terminar todas as integrações Meta (WhatsApp, Instagram, Marketing API) e Google (Ads, OAuth) o mais rápido possível.
**Prazo alvo:** App Reviews submetidos até domingo (aprovação leva 2-7 dias úteis depois).

> **Lê isto primeiro.** A ordem importa: cada item depende dos anteriores. Não pular.
> Tempo estimado total de trabalho ativo: **10-15h** distribuídas em 2 dias.
> Tempo de espera (review da Meta/Google): **2-7 dias úteis por permissão**.

---

## ⚡ Bloqueio crítico atual

Sem WhatsApp Cloud conectado a um tenant, **nada do App Review da Meta avança** (vídeos 1, 2, 3 dependem de mostrar o app funcionando com número real).

→ **Item #2 abaixo é o pré-requisito de tudo.**

---

## FASE 0 — Pré-requisitos (HOJE/AMANHÃ DE MANHÃ)

### 0.1 — URLs públicas respondendo ✅
- [x] `https://upixel.app/privacy-policy` → 200 OK
- [x] `https://upixel.app/terms-of-service` → 200 OK
- [x] `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/data-deletion-callback` → ativo

### 0.2 — Backup do código atual da VPS
```bash
cd /var/www/upixelcrm
git push origin claude/saas-architecture-setup-h8hxJ
```
- [ ] Push dos 58 commits locais pro GitHub (zero risco depois)

### 0.3 — Edge function `deauthorize-callback`
- [x] Código commitado em `claude/configure-callback-url-aeXGv`
- [ ] Migration aplicada no Supabase: `supabase db push` (ou via SQL Editor)
- [ ] Função deployada: `supabase functions deploy deauthorize-callback --no-verify-jwt`
- [ ] URL configurada no painel Meta (campo "Deauthorize Callback URL")

---

## FASE 1 — Conectar WhatsApp Cloud (~2h)

### 1.1 — Coletar credenciais na Meta
Painel Meta App → **Casos de uso → Conectar no WhatsApp → Configuração da API**

- [ ] Copiar **Phone Number ID** (número de teste ou número real Totum)
- [ ] Copiar **WABA ID** = `26391510550470607` (já identificado nos prints)
- [ ] Copiar **Access Token temporário** (24h) — suficiente pros vídeos
- [ ] (Pra produção) Criar **System User Token permanente** em Business Settings → Users → System Users

### 1.2 — Conectar no uPixel
- [ ] Login em `master.upixel.app` (ou `totum.upixel.app`)
- [ ] WhatsApp → "+ Adicionar número" → tab "API Oficial"
- [ ] Colar Phone Number ID + WABA ID + Access Token → Adicionar
- [ ] Confirmar status "Conectado" no card

### 1.3 — Configurar webhook na Meta
Painel Meta → Conectar no WhatsApp → **Configuração** → Webhook
- [ ] URL: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/whatsapp-cloud-webhook`
- [ ] Verify Token: o `webhook_verify_token` que aparece no card da integração no uPixel (após conectar)
- [ ] Clicar "Verificar e salvar"
- [ ] Assinar campos: `messages`, `message_template_status_update`, `account_update`, `account_alerts`, `account_review_update`

### 1.4 — Forma de pagamento da WABA
Painel Meta → Conectar no WhatsApp → topo da página (alerta amarelo)
- [ ] Adicionar cartão Totum no Gerenciador WhatsApp → WABA `26391510550470607` → Faturamento
- [ ] Confirmar moeda BRL e CNPJ correto

### 1.5 — Testar handshake
- [ ] Enviar mensagem do WhatsApp pessoal pro número conectado
- [ ] Confirmar que mensagem aparece no Inbox do uPixel
- [ ] Responder pelo Inbox → confirmar entrega

---

## FASE 2 — Conectar Instagram (~1h)

### 2.1 — Adicionar caso de uso na Meta
Painel Meta → **Casos de uso → Adicionar caso de uso → "Gerenciar mensagens e conteúdo no Instagram"**
- [ ] Personalizar
- [ ] Configuração → Webhook:
  - URL: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/instagram-webhook`
  - Verify Token: o que aparecer no uPixel após conectar IG
- [ ] Assinar campos: `messages`, `messaging_postbacks`, `comments`, `mentions`

### 2.2 — Conectar no uPixel
- [ ] Página Instagram do uPixel → conectar via Facebook Login
- [ ] Selecionar página FB + conta IG Business vinculada
- [ ] Confirmar webhook auto-registrado

### 2.3 — Permissões IG necessárias (pra App Review)
- `instagram_basic`
- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`
- `instagram_business_content_publish` (se for usar publicação)
- `instagram_business_manage_insights`
- `pages_messaging`, `pages_show_list`, `pages_manage_metadata`

---

## FASE 3 — Marketing API / Lead Ads (~30min)

### 3.1 — Webhook de leads
Caso de uso "Criar e gerenciar anúncios com a API de Marketing" → Webhooks
- [ ] Entidade: **Page**, campo: `leadgen`
- [ ] URL: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/meta-leads-webhook`
- [ ] Verify Token: o que aparecer no uPixel após conectar Meta Ads

### 3.2 — Permissões Marketing
- `ads_management`
- `ads_read`
- `business_management`
- `leads_retrieval`
- `pages_manage_ads` (se aplicável)

---

## FASE 4 — Google Ads + OAuth (~2-3h)

### 4.1 — Google Cloud Console
- [ ] Criar projeto (ou usar existente da Totum)
- [ ] APIs & Services → habilitar **Google Ads API**
- [ ] OAuth Consent Screen → tipo "External" → status "Testing" → publicar quando tiver tudo
- [ ] Credentials → criar **OAuth Client ID** tipo Web Application
  - Authorized origins: `https://upixel.app`, `https://*.upixel.app`
  - Redirect URIs: `https://xusdhzwfkzufupjwbebt.supabase.co/functions/v1/google-oauth/callback` (verificar exato no código)

### 4.2 — Google Ads Developer Token
- [ ] Logar em https://ads.google.com com conta de manager (MCC) Totum
- [ ] Tools → API Center → solicitar **Developer Token**
- [ ] Submeter formulário de Basic Access (depois Standard Access)
- ⏰ Aprovação Google: **3-15 dias úteis** (não dá pra acelerar)

### 4.3 — Configurar secrets no Supabase
```bash
supabase secrets set GOOGLE_CLIENT_ID="..."
supabase secrets set GOOGLE_CLIENT_SECRET="..."
supabase secrets set GOOGLE_ADS_DEVELOPER_TOKEN="..."
```

### 4.4 — Testar OAuth no uPixel
- [ ] Página Google Ads → conectar via Google
- [ ] Selecionar customer_id (MCC ou cliente direto)
- [ ] Confirmar sincronização de campanhas

### 4.5 — Google App Verification (se OAuth Consent for "Production")
Necessário se for atender clientes externos. Para uso interno Totum, pode ficar em "Testing" com até 100 usuários.
- [ ] Domain verification (Google Search Console)
- [ ] Privacy policy + Terms (já temos)
- [ ] Demo video (igual Meta)
- [ ] Submeter no Google Cloud Console → OAuth Consent Screen → "Submit for verification"
- ⏰ Aprovação Google: **4-6 semanas** (escopos sensíveis)

---

## FASE 5 — Preparar dados pro App Review Meta (~1h)

### 5.1 — Criar tenant `reviewer`
- [ ] Cadastrar `reviewer.upixel.app` via signup público
- [ ] Email: criar `reviewer@upixel.app` (ou usar grupototumadm@gmail.com)
- [ ] Senha: gerar forte e anotar

### 5.2 — Pré-popular dados de demonstração
- [ ] 3-5 leads de exemplo no CRM
- [ ] 2-3 conversas WhatsApp com histórico
- [ ] 1-2 templates aprovados (se já houver)
- [ ] 1 funil de automação configurado

### 5.3 — Adicionar usuários de teste no app Meta
Painel Meta → Funções do app → Usuários de teste
- [ ] Adicionar conta FB pessoal do reviewer/admin
- [ ] Aceitar convite na conta pessoal

---

## FASE 6 — Gravar vídeos (~3-5h)

Storyboards detalhados em `docs/meta-app-review-submission-kit.md`.

Permissões que precisam de vídeo:

- [ ] **Vídeo 1** — `whatsapp_business_messaging` (45-60s)
- [ ] **Vídeo 2** — `whatsapp_business_management` (45-60s)
- [ ] **Vídeo 3** — `instagram_business_manage_messages` (45-60s)
- [ ] **Vídeo 4** — `instagram_basic` + `pages_messaging` (20-30s, mostra OAuth)
- [ ] **Vídeo 5** — `ads_management` + `ads_read` (30s)
- [ ] **Vídeo 6** — `instagram_business_manage_comments` (30-40s)
- [ ] **Vídeo 7** — `business_management` (20s, mostra Embedded Signup completo)
- [ ] **Vídeo 8** — `leads_retrieval` (30s, mostra lead chegando do Lead Ads no CRM)

**Requisitos técnicos:**
- 720p mínimo
- Narração PT-BR ou legenda EN
- Mostrar app real (não mockup)
- Mostrar endpoint chamado (DevTools opcional)

**Ferramentas:** OBS Studio (gratuito) ou Loom.

---

## FASE 7 — Submeter App Review Meta (~1-2h)

Painel Meta → Análise → Análise do app → Novas solicitações

Pra **cada** permissão da lista:
- [ ] Anexar vídeo correspondente
- [ ] Colar texto "Caso de uso" (do `meta-app-review-submission-kit.md`)
- [ ] Colar texto "Por que precisa" (do mesmo doc)
- [ ] Colar texto "Como usa" (do mesmo doc)
- [ ] Adicionar credenciais do tenant `reviewer` em "Notas pro revisor"
- [ ] Confirmar Privacy Policy URL preenchida
- [ ] Confirmar Terms of Service URL preenchida
- [ ] Confirmar Data Deletion Callback URL preenchida
- [ ] Botão "Submit for Review"

---

## FASE 8 — Pós-submissão (espera + ajustes)

- ⏰ **Meta:** 2-7 dias úteis primeira resposta
- ⏰ **Google Developer Token:** 3-15 dias úteis
- ⏰ **Google App Verification:** 4-6 semanas (se necessário)

Se rejeitarem (normal na primeira rodada):
- [ ] Ler email da Meta com motivo
- [ ] Consultar tabela "Erros comuns" em `meta-app-review-submission-kit.md`
- [ ] Re-gravar vídeo / ajustar texto / re-submeter
- [ ] Ciclo geralmente: 1-2 rodadas até aprovar (~2-4 semanas total)

---

## FASE 9 — Pós-aprovação (depois)

Quando tudo aprovar, voltar para:

- [ ] **Embedded Signup do WhatsApp** (botão "Continuar com Facebook" pra clientes externos)
  - Implementação backend já existe na branch `claude/configure-callback-url-aeXGv`
  - Precisa: portar arquivos `CloudConnectModal.tsx` + `CloudEmbeddedSignup.tsx` + `facebook-sdk.ts` pra branch principal
  - Wirar no `WhatsAppPage.tsx` (botão no header)
  - Vars já configuradas: `VITE_META_APP_ID=911162198384188`, `VITE_META_WHATSAPP_CONFIG_ID=1602473340863868`
- [ ] **Embedded Signup do Instagram** (mesmo padrão)
- [ ] **Marketing API com criação de campanhas** (se quiser vender essa feature)
- [ ] **Google Ads com escrita** (criar/pausar campanhas, hoje só leitura)

---

## Resumo de prazos

| Etapa | Trabalho seu | Espera Meta/Google |
|---|---|---|
| Fases 0-5 (preparação + conectar) | ~6h | — |
| Fase 6 (gravar vídeos) | ~3-5h | — |
| Fase 7 (submeter) | ~2h | — |
| **Total trabalho ativo** | **~11-13h** | — |
| Fase 8 (review Meta WhatsApp/IG) | — | 2-7 dias |
| Fase 8 (review Marketing API) | — | 2-7 dias |
| Fase 8 (Google Developer Token) | — | 3-15 dias |
| Fase 8 (Google App Verification) | — | 4-6 semanas |

**Realista:** distribuição sugerida
- **Sábado:** Fases 0-5 (~6h)
- **Domingo:** Fases 6-7 (gravar + submeter, ~7h)
- **Próximas 1-3 semanas:** ajustes pós-rejeição até aprovar tudo

---

## Itens que ficaram pendentes desta sessão (não bloqueantes)

- [ ] `.env.production` está versionado no git — considerar adicionar ao `.gitignore` e mover credenciais pra um secret manager
- [ ] `meta-app-review-submission-kit.md` linha 19 menciona `https://upixel.app/functions/v1/data-deletion-callback` mas a URL real é Supabase. Verificar se há proxy ou atualizar doc.
- [ ] Docs `whatsapp-embedded-signup-setup.md` (372 linhas) — não revisado ainda, ler antes da Fase 9.
