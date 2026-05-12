# Meta App Review — Submission Kit uPixel

**App ID:** 911162198384188
**Business ID:** 882191119505136
**Status:** Em análise (WhatsApp). Instagram e Marketing pendentes.

Esse documento tem tudo o que você precisa pra completar a submissão de App Review.
Use junto com [whatsapp-embedded-signup-setup.md](./whatsapp-embedded-signup-setup.md).

---

## URLs públicas já configuradas

| Campo | Valor |
|---|---|
| Domain | `upixel.app` |
| Privacy Policy | https://upixel.app/privacy-policy |
| Terms of Service | https://upixel.app/terms-of-service |
| Data Deletion Callback | https://upixel.app/functions/v1/data-deletion-callback |
| Contact Email | grupototumadm@gmail.com |

---

## 🎥 Vídeos de demonstração

Meta exige **vídeo separado por permissão sensível**. Resolução mínima 720p, 30-90s cada.

### Vídeo 1 — `whatsapp_business_messaging`

**Storyboard:**

| Tempo | O que mostrar | Narração (PT-BR) |
|---|---|---|
| 0-5s | Tela de login do uPixel em `master.upixel.app` | "Login no uPixel CRM com a conta da empresa." |
| 5-10s | Após login, sidebar → clica em "Inbox" | "Esse é o Inbox do uPixel — central de mensagens." |
| 10-20s | Abre uma conversa existente, mostra histórico | "Conversa do cliente João Silva. Mensagens recebidas via Cloud API." |
| 20-35s | Digita "Olá! Sua proposta foi enviada por email." e clica Enviar | "Enviando uma resposta diretamente pelo uPixel — atrás dos panos vai pra Cloud API." |
| 35-45s | Split-screen / alt-tab: mostra mensagem chegando no WhatsApp do receptor (celular ou Web) | "Mensagem entregue ao destinatário em tempo real." |
| 45-55s | Volta ao uPixel: mensagem aparece como "Enviada" na timeline | "Status atualizado via webhook da Meta." |

**Setup pré-gravação:**
- Tenant master conectado a um número WhatsApp Cloud de teste
- 1 conversa ativa com histórico
- Celular ao lado mostrando WhatsApp do receptor (use um número seu pessoal pra receber)

**Ferramentas:** OBS Studio (gratuito) ou Loom (mais rápido).

### Vídeo 2 — `whatsapp_business_management`

**Storyboard:**

| Tempo | O que mostrar | Narração |
|---|---|---|
| 0-5s | uPixel → Disparos → aba "Gestão de Templates" | "Aqui o cliente gerencia templates aprovados pela Meta." |
| 5-15s | Clica "Novo Template" | "Vou criar um template novo." |
| 15-30s | Preenche: nome `aviso_pedido`, categoria UTILITY, idioma pt_BR, corpo "Olá {{1}}, seu pedido #{{2}} foi confirmado." | "Nome, categoria utility, idioma e corpo com variáveis." |
| 30-40s | Clica "Salvar e enviar pra aprovação" | "Salvando — vai pra fila de aprovação da Meta." |
| 40-50s | Mostra template aparecendo na lista com status "Pendente" | "Template enviado. Quando Meta aprovar, fica disponível pros disparos." |

### Vídeo 3 — `instagram_manage_messages` (quando for Instagram)

| Tempo | O que mostrar | Narração |
|---|---|---|
| 0-10s | uPixel → Inbox, filtra por canal Instagram | "Mensagens recebidas no Instagram aparecem no mesmo Inbox." |
| 10-25s | Abre uma DM do Instagram, digita resposta e envia | "Respondendo via Direct sem sair do CRM." |
| 25-35s | Verifica recebimento no app Instagram (celular ao lado) | "Mensagem entregue no app Instagram do destinatário." |
| 35-50s | Volta ao uPixel → Automações → Funis Instagram → cria regra "Comment INFO → DM" | "Aqui o cliente automatiza: quem comenta 'INFO' num post recebe DM automática." |

### Vídeo 4 — `instagram_basic` + `pages_messaging`

Mostra a tela de **Conectar Instagram via Facebook** funcionando: usuário clica botão, popup FB aparece, escolhe página, sucesso. Curtinho, 20-30s. Demonstra o flow de OAuth completo.

### Vídeo 5 — `ads_management` (quando for Marketing API)

| Tempo | O que mostrar | Narração |
|---|---|---|
| 0-5s | uPixel → Meta Ads, conectar via Facebook | "Cliente conecta sua conta de anúncios via Facebook Login." |
| 5-20s | Mostra dashboard com campanhas listadas (KPIs: impressões, cliques, conversões) | "Sincronizamos campanhas pra mostrar performance dentro do CRM." |
| 20-30s | Click "Sincronizar" e mostra refresh dos dados | "Sincronização sob demanda — não criamos campanhas, só leitura de métricas." |

---

## 📝 Copy pronto pros campos de formulário

Cole exatamente nos campos correspondentes do Meta App Review.

### Para todas as permissões do WhatsApp

**Caso de uso (Como você vai usar):**
```
O uPixel CRM é uma plataforma SaaS multi-tenant brasileira que centraliza
atendimento ao cliente para PMEs (pequenas e médias empresas). Cada cliente
final (tenant) tem seu próprio subdomínio em *.upixel.app e autoriza a
integração com WhatsApp Cloud API via Embedded Signup do Facebook. Após
autorização, o uPixel:

1. Recebe mensagens recebidas no número WhatsApp via webhook seguro
2. Permite ao cliente responder pela interface unificada (Inbox)
3. Permite ao cliente criar e enviar templates aprovados pela Meta
4. Mantém histórico de conversas associado a leads no CRM

Os usuários podem revogar o acesso a qualquer momento pela tela
Configurações → WhatsApp do próprio uPixel ou pelo Meta Business Manager.
Não armazenamos credenciais permanentes do usuário final — usamos apenas
o access token de longa duração emitido pela própria Meta.

Política de privacidade: https://upixel.app/privacy-policy
Termos de serviço: https://upixel.app/terms-of-service
```

### Para `whatsapp_business_messaging`

**Por que sua integração precisa dessa permissão:**
```
Necessária para que o uPixel envie mensagens em nome do cliente final
através da WhatsApp Cloud API. Sem essa permissão, os usuários só
conseguiriam receber mensagens, não responder — quebrando o caso de uso
principal do CRM.
```

**Como você usa essa permissão:**
```
Apenas para enviar mensagens (texto, mídia, templates) iniciadas por
ação explícita do usuário final dentro do painel do uPixel. Não enviamos
mensagens automatizadas sem consentimento prévio do destinatário (regra
de janela 24h da Meta é respeitada). Templates seguem fluxo de aprovação
oficial da Meta.
```

### Para `whatsapp_business_management`

**Por que sua integração precisa dessa permissão:**
```
Necessária para o fluxo de Embedded Signup do WhatsApp Business: durante
o popup do Facebook Login, o usuário final autoriza o uPixel a vincular
sua conta WhatsApp Business e número de telefone à plataforma. Também
usada para criar templates pelo CRM e gerenciar webhook subscriptions
em nome do cliente.
```

### Para `instagram_manage_messages`

**Caso de uso:**
```
O uPixel permite que clientes Instagram Business respondam Direct Messages
e gerenciem comentários através da interface unificada do CRM. Casos de uso
principais:

1. Receber DMs do Instagram via webhook e exibi-las no Inbox
2. Enviar respostas manuais via interface do CRM
3. Configurar funis automáticos: quando alguém comenta uma palavra-chave em
   um post (ex: "INFO"), o sistema envia uma DM automática via Private Reply
   API com material informativo
4. Receber notificação quando a conta é mencionada em stories de outros usuários

Política: https://upixel.app/privacy-policy
```

### Para `instagram_basic` + `pages_messaging` + `pages_show_list` + `pages_manage_metadata`

**Por que precisa:**
```
Permissões necessárias pelo Facebook Login for Business: o uPixel precisa
listar as Páginas Facebook que o usuário gerencia, identificar quais delas
estão vinculadas a contas Instagram Business, e subscrever a app aos
webhooks da conta Instagram escolhida. São prerequisitos técnicos da própria
Meta para o Embedded Signup do Instagram Direct funcionar.
```

### Para `ads_management` + `ads_read`

**Caso de uso:**
```
O uPixel sincroniza dados de campanhas Meta Ads do cliente final para o
painel de marketing do CRM, permitindo:

1. Listar campanhas ativas, pausadas e arquivadas
2. Mostrar métricas: impressões, cliques, custo, conversões, CTR, CPM
3. Cruzar leads vindos de Lead Ads com formulários Meta via webhook
4. Calcular ROI por campanha unindo dados de Ads + conversão CRM

NÃO criamos, editamos ou pausamos campanhas. Acesso somente leitura mais
gestão de leads. Tokens armazenados encriptados; acesso pode ser revogado
a qualquer momento pelo cliente em Configurações.
```

### Para `business_management`

**Por que precisa:**
```
Permissão de leitura do Business Manager do cliente para identificar quais
contas de anúncio, páginas e contas WhatsApp Business o usuário tem acesso
durante o Embedded Signup. Sem ela, o popup do Facebook Login não consegue
mostrar as opções pro usuário escolher qual ativo conectar.
```

---

## 🔐 Privacy & Data Handling (perguntas comuns no formulário)

**Onde os dados ficam armazenados?**
```
Banco PostgreSQL hospedado pelo Supabase (AWS São Paulo - sa-east-1).
Acesso restrito a admins do uPixel via service_role com auditoria.
RLS (Row-Level Security) garante isolamento entre tenants — cada cliente
só vê seus próprios dados.
```

**Como é o handling de mensagens?**
```
Mensagens recebidas via webhook são armazenadas para histórico do
atendimento. Mídia (imagens, áudio, vídeo) é baixada da CDN da Meta e
re-hospedada no Supabase Storage para garantir disponibilidade.
Dados pessoais (nome, telefone, foto de perfil) seguem retenção configurável
pelo cliente final, com possibilidade de exclusão via Data Deletion Callback.
```

**Como o usuário revoga acesso?**
```
3 caminhos:
1. Pelo próprio uPixel: Configurações → WhatsApp/Instagram → Remover número
2. Pelo Meta Business Manager: revogar permissões do app
3. Pelo Data Deletion Request URL: https://upixel.app/functions/v1/data-deletion-callback
   (suporta o protocolo padrão de exclusão da Meta)
```

**Política de retenção de dados:**
```
Mensagens: padrão indefinido (cliente final controla). Cliente pode
configurar política de retenção em Configurações → Privacidade (planos pagos).
Tokens de acesso: armazenados encriptados, renovados automaticamente
quando expiram. Logs de auditoria: 90 dias.
```

---

## ✅ Checklist final antes de submeter

Para CADA permissão a ser solicitada:

- [ ] Vídeo gravado em ≥ 720p, ≤ 90s
- [ ] Áudio narrado em português OU legendas em inglês
- [ ] Vídeo mostra **o app uPixel real funcionando** (não mockup nem slide)
- [ ] Mostra o exato endpoint da API sendo chamado (visualmente, mesmo que dev tools aberto)
- [ ] Caso de uso e justificativa preenchidos (copy acima)
- [ ] Privacy Policy URL respondendo 200 (testa: https://upixel.app/privacy-policy)
- [ ] Terms of Service URL respondendo 200
- [ ] Data Deletion Callback respondendo (POST com user_id)
- [ ] App está em modo **Live/Publicado**, não Development

Quando todos OK: clica **Submit for Review** no Meta Dashboard.

---

## 📞 Se a review for negada

Erros comuns e correções:

| Erro Meta | Causa | Fix |
|---|---|---|
| "Video does not demonstrate use of the permission" | Vídeo não mostra a permissão sendo usada na prática | Re-grave focando no endpoint específico |
| "App functionality cannot be verified" | App requer login e Meta não conseguiu acessar | Crie um usuário de teste com permissões e inclua credenciais nas notas pra Meta |
| "Privacy Policy missing required information" | Política não menciona Meta especificamente | Adicione seção sobre uso de dados Meta na política |
| "Use case not aligned with permission scope" | Caso de uso amplo demais | Reescreva sendo mais específico sobre o caso de uso |

Re-submeter geralmente leva mais 1-7 dias úteis.

---

## 🤖 Acompanhamento

Status fica em:
https://developers.facebook.com/apps/911162198384188/app-review/

Notificações por email quando muda status (admin do app recebe).
