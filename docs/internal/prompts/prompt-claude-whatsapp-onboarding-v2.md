# PROMPT DE IMPLANTAÇÃO — uPixel WhatsApp Onboarding Wizard v2.0

## 📋 CONTEXTO

**Projeto:** uPixel CRM — Fluxo de conexão WhatsApp via Evolution API  
**Arquivo base:** `src/pages/WhatsAppPage.tsx` + `src/hooks/useWhatsAppInstances.ts` + `src/hooks/useWhatsAppIntegration.ts`  
**Nível:** 🚀 Produção (altera UX crítica — testar antes de deploy)  
**Stack:** React 18 + TypeScript + Tailwind CSS + shadcn/ui + Supabase Edge Functions  
**Sistema:** Vibe Coding Totum v3.0

**Missão:** Substituir o modal de formulário técnico atual por um **Wizard de Onboarding amigável, visual e guiado**, que transforme a conexão de WhatsApp via Evolution API de um processo técnico-confuso em uma experiência de "configuração em 3 passos".

---

## 🔍 DIAGNÓSTICO DO FLUXO ATUAL (PROBLEMAS)

### 1. Tela Vazia = Desanimadora
```
┌─────────────────────────────┐
│  [Ícone cinza genérico]      │
│  Nenhum número configurado   │
│  Adicione um número...       │
│  [+ Adicionar primeiro       │
│   número]                    │
└─────────────────────────────┘
```
**Problema:** Não explica o que é "instância", não motiva, não mostra valor.

### 2. Modal Técnico = Intimidadora
```
┌─────────────────────────────┐
│  Adicionar número            │
│                              │
│  [QR Code] [API Oficial]     │
│                              │
│  URL do Servidor Evolution   │
│  [https://...____________]   │
│                              │
│  Nome da Instância           │
│  [meu-numero-1___________]   │
│  (Identificador único...)    │
│                              │
│  Evolution API Key           │
│  [•••••••________________]   │
│                              │
│  [Cancelar] [Adicionar]      │
└─────────────────────────────┘
```
**Problemas:**
- Usuário precisa saber o que é "Evolution API"
- Precisa ter a URL do servidor pronta
- Precisa ter a API Key
- Não sabe se vai funcionar antes de clicar "Adicionar"
- QR Code só aparece **DEPOIS** de salvar (2 passos separados)
- Sem validação em tempo real
- Sem ajuda contextual
- Sem explicação da diferença QR Code vs API Oficial

### 3. Fluxo Quebrado (2 Passos)
```
Passo 1: Preencher formulário → Clicar "Adicionar" → Instância criada
Passo 2: Clicar "Conectar via QR" → QR Code aparece → Escanear
```
**Problema:** Usuário não entende por que precisa "adicionar" e depois "conectar". Parece que algo deu errado no meio.

### 4. Sem Detecção de Erros
- Se a URL estiver errada: só descobre após clicar "Adicionar"
- Se a API Key estiver inválida: só descobre após clicar
- Sem "testar conexão" antes de salvar

---

## 🎯 OBJETIVO: NOVO FLUXO "3 PASSOS"

Transformar em:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎉 Bem-vindo! Vamos conectar seu WhatsApp                 │
│                                                             │
│  Em 3 passos simples você estará recebendo mensagens         │
│  no uPixel. Não precisa ser técnico.                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PASSO 1 → PASSO 2 → PASSO 3                      │   │
│  │  Servidor    Criar      QR Code                    │   │
│  │  Evolution   Instância   & Pronto!                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Começar →]                                               │
│                                                             │
│  💡 Precisa de ajuda? Fale com nosso assistente →           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ NOVA ESTRUTURA: WHATSAPP ONBOARDING WIZARD

### COMPONENTES A CRIAR (novos arquivos)

```
src/components/whatsapp/
├── onboarding/
│   ├── WhatsAppOnboarding.tsx          ← Wizard principal (container)
│   ├── WelcomeScreen.tsx               ← Tela de boas-vindas
│   ├── ProgressSteps.tsx               ← Barra de progresso visual
│   ├── Step1_ServerSetup.tsx           ← Conectar ao servidor Evolution
│   ├── Step2_InstanceSetup.tsx         ← Criar nome da instância
│   ├── Step3_QRConnect.tsx             ← QR Code e conexão final
│   ├── OnboardingSidebar.tsx           ← Sidebar com ajuda/FAQ
│   ├── ConnectionTest.tsx              ← Componente de teste de conexão
│   ├── TypeSelector.tsx                ← Escolha QR Code vs API Oficial
│   └── InstanceCardV2.tsx              ← Card de instância redesenhado
```

### COMPONENTES A ALTERAR (arquivos existentes)

```
src/pages/WhatsAppPage.tsx              ← Usar wizard quando não há instâncias
src/hooks/useWhatsAppInstances.ts       ← Adicionar função de teste de conexão
```

---

## 📐 DETALHAMENTO DE CADA COMPONENTE

### 1. WhatsAppOnboarding.tsx (Container Principal)

**Props:**
```typescript
interface WhatsAppOnboardingProps {
  onComplete: () => void;        // Callback quando conecta com sucesso
  onCancel: () => void;          // Callback quando cancela
}
```

**Estado interno:**
```typescript
type Step = "welcome" | "type-select" | "server" | "instance" | "qr" | "success";
type InstanceType = "evolution" | "official";

interface WizardState {
  step: Step;
  instanceType: InstanceType | null;
  serverUrl: string;
  serverConnected: boolean;
  apiKey: string;
  instanceName: string;
  isInstanceNameValid: boolean | null;
  qrCodeData: string | null;
  connectionStatus: "idle" | "testing" | "connected" | "error";
  errorMessage: string | null;
}
```

**Layout geral:**
```
┌──────────────────────────────────────────────────────────┐
│  HEADER (fixo)                                            │
│  [Logo uPixel]  Conectar WhatsApp  [X Fechar]            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │                    │  │                            │  │
│  │   ÁREA PRINCIPAL   │  │      SIDEBAR DE AJUDA      │  │
│  │                    │  │                            │  │
│  │   (wizard steps)   │  │  • O que é Evolution?      │  │
│  │                    │  │  • Onde encontro a URL?    │  │
│  │                    │  │  • O que é API Key?         │  │
│  │                    │  │  • Diferença QR vs Oficial │  │
│  │                    │  │  • [Falar com suporte →]   │  │
│  │                    │  │                            │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                           │
│  FOOTER (fixo)                                            │
│  [← Voltar]                              [Próximo →]     │
│  (desabilitado no passo 1)                               │
└──────────────────────────────────────────────────────────┘
```

---

### 2. WelcomeScreen.tsx

**Objetivo:** Motivar e contextualizar antes de começar.

**Copy:**
```
🎉 Bem-vindo! Vamos conectar seu WhatsApp

Em 3 passos simples você estará recebendo e respondendo
mensagens no uPixel. Não precisa ser técnico.

┌─────────────────────────────────────────┐
│  ┌─────┐   ┌─────┐   ┌─────┐            │
│  │ 1️⃣  │ → │ 2️⃣  │ → │ 3️⃣  │            │
│  │Servidor│  │Criar │  │QR   │            │
│  │Evolution│ │Instância│ │Code │            │
│  └─────┘   └─────┘   └─────┘            │
│  ~2 minutos                             │
└─────────────────────────────────────────┘

O que você vai conseguir:
✓ Receber mensagens do WhatsApp no uPixel
✓ Responder pelo computador, não pelo celular
✓ Ter histórico de todas as conversas
✓ Usar automações e IA

[Começar agora →]

💡 Não tem servidor Evolution? Clique aqui para saber como criar
   (leva 5 minutos e é gratuito)

❓ Precisa de ajuda? Fale com nosso assistente →
```

**Elementos visuais:**
- Ilustração animada (SVG) mostrando celular → nuvem → computador
- 3 cards de benefício abaixo do passo a passo
- Botão primário grande com ícone de seta
- Link secundário para "Como criar servidor Evolution" (abre modal/tutorial)
- Link terciário para assistente de suporte

---

### 3. Step1_ServerSetup.tsx

**Objetivo:** Conectar ao servidor Evolution com validação em tempo real.

**Copy do topo:**
```
Passo 1 de 3 — Conectar ao servidor

O uPrecisa de um servidor Evolution para se comunicar com o WhatsApp.
Se você já tem um, é só colar a URL abaixo. Se não tem, clique em
"Como criar" no menu de ajuda ao lado.
```

**Formulário:**
```
┌─────────────────────────────────────────┐
│                                         │
│  🔗 URL do servidor Evolution API       │
│  [https://api.minhaempresa.com.br____]  │
│  💡 Dica: termina com .com.br, .io, etc │
│                                         │
│  🔑 Evolution API Key                   │
│  [___________________________________]  │
│  💡 Encontre no painel do seu servidor  │
│                                         │
│  [🔍 Testar conexão]                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ✅ Servidor conectado!          │    │
│  │  Versão: 1.8.2 | Status: Online  │    │
│  │  [Ver detalhes ▼]                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ❌ Não foi possível conectar    │    │
│  │  Verifique a URL e a API Key     │    │
│  │  [Tentar novamente]              │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Comportamento:**
- Input de URL com validação de formato (deve começar com https://)
- Input de API Key com toggle de visibilidade (👁️)
- Botão "Testar conexão" faz chamada à Edge Function `whatsapp-proxy?action=status`
- **Feedback visual imediato:**
  - Loading state com spinner e texto "Testando conexão com servidor..."
  - Sucesso: card verde com checkmark + versão do Evolution + status
  - Erro: card vermelho com X + mensagem específica + botão "Tentar novamente"
- Botão "Próximo" só habilita após conexão bem-sucedida

**Edge Function:** Reutilizar `whatsapp-proxy` com action `status` ou criar nova action `test-connection`.

---

### 4. Step2_InstanceSetup.tsx

**Objetivo:** Criar um nome amigável para a instância (não técnico).

**Copy do topo:**
```
Passo 2 de 3 — Identificar seu número

Dê um nome para este WhatsApp. Pode ser "Vendas Principal",
"Suporte" ou o nome da pessoa que vai usar.

Este nome é só para você organizar dentro do uPixel.
```

**Formulário:**
```
┌─────────────────────────────────────────┐
│                                         │
│  📱 Nome do WhatsApp                    │
│  [Vendas Principal________________]     │
│  💡 Exemplos: "Suporte", "Vendas",      │
│     "João - Comercial"                  │
│                                         │
│  🔢 Nome técnico da instância           │
│  [vendas-principal________________]     │
│  (gerado automaticamente, pode editar)│
│                                         │
│  ✅ Nome disponível                     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📋 Resumo do que será criado:   │    │
│  │                                   │    │
│  │  Nome: Vendas Principal            │    │
│  │  Servidor: api.minhaempresa.com.br │    │
│  │  Tipo: QR Code (Evolution API)     │    │
│  │                                   │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Comportamento:**
- Input de "Nome amigável" é o principal (obrigatório)
- "Nome técnico" é auto-gerado a partir do nome amigável (slugify)
- Nome técnico pode ser editado manualmente
- Validação em tempo real:
  - Verificar se nome técnico já existe (chamar API)
  - Mostrar ✅ ou ❌ com mensagem
- Card de resumo mostrando tudo que será criado
- Botão "Próximo" habilitado quando nome é válido

---

### 5. Step3_QRConnect.tsx

**Objetivo:** QR Code aparece IMEDIATAMENTE, sem salvar antes.

**Copy do topo:**
```
Passo 3 de 3 — Conectar seu celular

Agora é só escanear o QR Code com seu WhatsApp.
Assim que escanear, você já pode receber mensagens!
```

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │      [QR CODE AQUI]             │    │
│  │                                 │    │
│  │    ┌─────────────────────┐     │    │
│  │    │  ⏳ Gerando QR...    │     │    │
│  │    │  Aguarde alguns      │     │    │
│  │    │  segundos            │     │    │
│  │    └─────────────────────┘     │    │
│  │                                 │    │
│  │  └──────────────────────────┘   │    │
│  │  Borda animada (pulse)          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📲 Como escanear:                     │
│  1. Abra o WhatsApp no celular          │
│  2. Toque nos ⋮ (3 pontinhos)           │
│  3. "Dispositivos conectados"           │
│  4. "Conectar dispositivo"              │
│  5. Aponte a câmera para o QR Code      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ⏱️ O QR Code se atualiza a cada │    │
│  │    30 segundos. Fique de olho!   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [↻ Gerar novo QR Code]                 │
│                                         │
└─────────────────────────────────────────┘
```

**Comportamento:**
- QR Code é gerado automaticamente ao entrar no passo (não precisa clicar nada)
- Loading state enquanto gera
- QR Code centralizado em card branco com borda animada (pulse)
- **Polling automático** para detectar conexão:
  - A cada 3 segundos, verifica status via `whatsapp-proxy?action=status`
  - Quando status = "connected", avança automaticamente para "success"
- Timer mostrando "QR expira em 30s" com contagem regressiva
- Botão "Gerar novo QR" para renovar
- Instruções passo a passo com ícones (não texto corrido)

**Fluxo técnico:**
```
Entrar no Step 3
  → Chamar whatsapp-proxy?action=save-config (salva instância)
  → Chamar whatsapp-proxy?action=connect (gera QR)
  → Exibir QR
  → Iniciar polling de status a cada 3s
  → Se connected: mostrar SuccessScreen
  → Se erro: mostrar mensagem + botão retry
```

---

### 6. SuccessScreen.tsx

**Objetivo:** Celebrar e direcionar para próxima ação.

**Copy:**
```
🎉 WhatsApp conectado com sucesso!

Seu número (31) 91234-5678 agora está recebendo
mensagens no uPixel.

┌─────────────────────────────────────────┐
│  O que você pode fazer agora:            │
│                                         │
│  💬 [Ir para o Inbox]                   │
│     Ver mensagens recebidas             │
│                                         │
│  🤖 [Criar automação]                   │
│     Resposta automática e follow-up     │
│                                         │
│  👥 [Adicionar mais números]            │
│     Conectar outros WhatsApps           │
│                                         │
└─────────────────────────────────────────┘

💡 Dica: Configure uma resposta automática para
não deixar nenhum lead esperando!
```

**Elementos:**
- Animação de confetti ou checkmark grande pulsante
- Número conectado exibido
- 3 CTAs claros com ícones
- Dica contextual abaixo

---

### 7. OnboardingSidebar.tsx

**Objetivo:** Ajuda contextual persistente durante todo o wizard.

**Conteúdo (adapta por step):**

**Step 1 (Servidor):**
```
❓ Precisa de ajuda?

📖 O que é Evolution API?
   Uma API que conecta o WhatsApp ao uPixel
   sem precisar do WhatsApp Business.

🔗 Onde encontro a URL?
   No painel do seu servidor Evolution.
   Se você não tem um, podemos ajudar a criar.

🔑 Onde encontro a API Key?
   No painel do servidor, em "Configurações" > "API Key".

[📺 Ver tutorial em vídeo →]
[💬 Falar com suporte →]
```

**Step 2 (Instância):**
```
❓ O que é "instância"?

É como um "aplicativo" do WhatsApp dentro do uPixel.
Você pode ter várias instâncias (ex: Vendas, Suporte)
conectadas ao mesmo servidor.

Cada instância = 1 número de WhatsApp.
```

**Step 3 (QR Code):**
```
❓ Não está escaneando?

1. Certifique-se que o QR Code está nítido
2. Se expirou, clique em "Gerar novo"
3. No celular, vá em:
   WhatsApp > ⋮ > Dispositivos conectados

⚠️ Seu celular precisa ter internet.
```

**Comportamento:**
- Sidebar fixa à direita (desktop), colapsável (mobile)
- Conteúdo adapta conforme o step atual
- Links clicáveis para modais de ajuda
- Botão "Falar com suporte" abre chat interno

---

### 8. ProgressSteps.tsx

**Visual:**
```
┌─────────────────────────────────────────┐
│  ●──────●──────○                      │
│  1      2      3                        │
│  Servidor Criar   QR                   │
│  Evolution Instância Code              │
└─────────────────────────────────────────┘
```

**Requisitos:**
- Step atual: círculo preenchido com cor primária
- Steps completos: círculo com checkmark
- Steps futuros: círculo vazio
- Linha conectora entre steps
- Animação de transição ao avançar
- Labels abaixo de cada círculo

---

### 9. TypeSelector.tsx (Melhorado)

**Visual atual vs Novo:**

Atual (técnico):
```
[QR Code]        [API Oficial]
Via Evolution    Meta Business
```

Novo (comercial + visual):
```
┌─────────────────────────────────────────┐
│  Qual tipo de WhatsApp você quer         │
│  conectar?                               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📱 QR Code                      │   │
│  │                                  │   │
│  │  Para WhatsApp pessoal ou        │   │
│  │  Business (qualquer um)          │   │
│  │                                  │   │
│  │  ✅ Gratuito                      │   │
│  │  ✅ Setup instantâneo             │   │
│  │  ⚠️ Precisa manter celular online │   │
│  │                                  │   │
│  │  [Escolher este →]               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ✓ API Oficial (Meta)            │   │
│  │                                  │   │
│  │  Para empresas com CNPJ          │   │
│  │  (WhatsApp Business verificado)  │   │
│  │                                  │   │
│  │  ✅ Número verificado             │   │
│  │  ✅ Mensagens em massa           │   │
│  │  ✅ Templates oficiais           │   │
│  │  ⚠️ Requer aprovação Meta        │   │
│  │  💰 Pago por conversa            │   │
│  │                                  │   │
│  │  [Escolher este →]               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  💡 Não sabe qual escolher?             │
│     90% dos usuários começam com QR Code│
└─────────────────────────────────────────┘
```

**Comportamento:**
- Cards grandes com hover effect
- Checkmarks e warnings visuais (✅/⚠️)
- Badge "Recomendado" no QR Code (para 90% dos usuários)
- Dica no rodapé
- Ao selecionar: card expande mostrando mais detalhes

---

### 10. WhatsAppPage.tsx (Alteração)

**Lógica condicional:**
```typescript
export default function WhatsAppPage() {
  const { instances, loading, refresh } = useWhatsAppInstances();
  
  // NOVO: Mostrar wizard quando não há instâncias
  // ou quando usuário clica "Adicionar número"
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  if (!loading && instances.length === 0 && !showOnboarding) {
    return (
      <AppLayout title="WhatsApp" subtitle="Conecte seu número">
        <EmptyStateOnboarding onStart={() => setShowOnboarding(true)} />
      </AppLayout>
    );
  }
  
  if (showOnboarding) {
    return (
      <WhatsAppOnboarding
        onComplete={() => { refresh(); setShowOnboarding(false); }}
        onCancel={() => setShowOnboarding(false)}
      />
    );
  }
  
  // ... resto do código atual (lista de instâncias)
}
```

**EmptyStateOnboarding:**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📱                              │    │
│  │  WhatsApp não conectado          │    │
│  │                                  │    │
│  │  Conecte seu WhatsApp para       │    │
│  │  começar a receber mensagens     │    │
│  │  no uPixel.                      │    │
│  │                                  │    │
│  │  [🚀 Conectar WhatsApp →]        │    │
│  │                                  │    │
│  │  💡 Leva menos de 2 minutos      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📊 O que você vai conseguir:    │    │
│  │                                  │    │
│  │  ✓ Receber mensagens no inbox    │    │
│  │  ✓ Responder pelo computador     │    │
│  │  ✓ Automatizar respostas         │    │
│  │  ✓ Ver relatórios de conversão   │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔄 FLUXO COMPLETO (USER JOURNEY)

```
Usuário entra em Configurações > WhatsApp
  → Vê EmptyStateOnboarding
  → Clica "Conectar WhatsApp"
    
    → WelcomeScreen
    → Clica "Começar agora"
      
      → TypeSelector
      → Escolhe "QR Code" (ou API Oficial)
        
        → Step1_ServerSetup
        → Digita URL + API Key
        → Clica "Testar conexão"
          → Sucesso: mostra card verde
          → Clica "Próximo"
            
            → Step2_InstanceSetup
            → Digita nome amigável
            → Nome técnico auto-gerado
            → Validação em tempo real
            → Clica "Próximo"
              
              → Step3_QRConnect
              → QR Code gerado automaticamente
              → Polling a cada 3s
              → Usuário escaneia no celular
              → Status muda para "connected"
                
                → SuccessScreen
                → Mostra número conectado
                → CTAs: Ir para Inbox / Criar automação / Adicionar mais
                → Clica "Ir para Inbox"
                  
                  → Redireciona para /inbox
                  → Primeira mensagem aparece!
```

**Tempo estimado:** 1-2 minutos para usuário comum.

---

## 📡 ALTERAÇÕES NO HOOK

### useWhatsAppInstances.ts (Adições)

```typescript
// NOVA FUNÇÃO: Testar conexão com servidor
const testConnection = useCallback(
  async (apiUrl: string, apiKey: string) => {
    const { data, error } = await supabase.functions.invoke(
      `whatsapp-proxy?action=test-connection`,
      {
        body: { api_url: apiUrl, api_key: apiKey },
      }
    );
    if (error) throw new Error(error.message);
    return data; // { success: boolean, version?: string, message?: string }
  },
  []
);

// NOVA FUNÇÃO: Verificar se nome de instância existe
const checkInstanceName = useCallback(
  async (name: string) => {
    const { data, error } = await supabase.functions.invoke(
      `whatsapp-proxy?action=check-instance&name=${encodeURIComponent(name)}`
    );
    if (error) throw new Error(error.message);
    return data; // { available: boolean }
  },
  []
);

return {
  ... // funções existentes
  testConnection,
  checkInstanceName,
};
```

### Supabase Edge Function (whatsapp-proxy)

**Nova action:** `test-connection`
```typescript
// Recebe: { api_url: string, api_key: string }
// Retorna: { success: true, version: "1.8.2", status: "online" }
// Ou: { success: false, message: "URL inválida ou servidor offline" }
```

**Nova action:** `check-instance`
```typescript
// Recebe: query param ?name=xxx
// Retorna: { available: true }
// Ou: { available: false, message: "Instância já existe" }
```

---

## 🎨 ESTILOS E COMPONENTES UI (shadcn/ui)

**Componentes a usar:**
- `Button` (variants: default, outline, ghost, destructive)
- `Input` (com ícones e validação)
- `Label`
- `Dialog` (para modais de ajuda)
- `Badge` (status tags)
- `Card` (cards de opção, resumo)
- `Progress` (barra de progresso)
- `Skeleton` (loading states)
- `Alert` (mensagens de erro/sucesso)
- `Tooltip` (dicas em ícones)
- `Separator` (divisores visuais)
- `Accordion` (FAQ na sidebar)

**Cores por status:**
- Sucesso: `text-success border-success bg-success/10` (verde)
- Erro: `text-destructive border-destructive bg-destructive/10` (vermelho)
- Info: `text-accent border-accent bg-accent/10` (azul)
- Warning: `text-[hsl(38,92%,50%)]` (amarelo/laranja)

**Animações:**
- Fade in ao entrar no step
- Slide horizontal entre steps
- Pulse no QR Code
- Spin no loading
- Scale no hover dos cards de tipo

---

## ♿ ACESSIBILIDADE

- Todos os inputs com `label` associado
- Botões com `aria-label` quando só ícone
- Cores não devem ser único indicador de estado (ícones também)
- Focus rings visíveis em todos os elementos interativos
- Toast anunciado via aria-live
- Modal com `aria-describedby` e focus trap

---

## 📱 RESPONSIVIDADE

**Desktop (>1024px):**
- Layout 2 colunas: wizard (60%) + sidebar (40%)
- Sidebar visível sempre

**Tablet (768-1024px):**
- Layout 1 coluna
- Sidebar em accordion colapsável abaixo do wizard

**Mobile (<768px):**
- Layout 1 coluna, full-width
- Sidebar em bottom sheet (swipe up)
- Progress steps horizontal scroll se necessário
- QR Code em tela cheia quando gerado
- Botões de ação fixos no bottom

---

## ⚡ PERFORMANCE

- Lazy load do componente de QR Code (só carrega no step 3)
- Debounce na validação de nome de instância (300ms)
- Polling de status com cleanup (clearInterval)
- Skeleton loading ao trocar de step
- Não carregar sidebar pesada em mobile (lazy)

---

## 🚫 REGRAS E RESTRIÇÕES

**NÃO faça:**
- ❌ Não alterar a API da Edge Function existente (whatsapp-proxy) — só adicionar novas actions
- ❌ Não remover o fluxo atual completamente — manter como fallback
- ❌ Não alterar o schema do banco de dados
- ❌ Não alterar autenticação ou multi-tenancy
- ❌ Não usar bibliotecas externas (manter shadcn/ui + Tailwind)
- ❌ Não alterar a paleta de cores do uPixel

**FAÇA:**
- ✅ Manter compatibilidade com instâncias existentes
- ✅ O wizard deve funcionar para NOVAS instâncias apenas
- ✅ Instâncias existentes continuam mostradas no card atual
- ✅ Reutilizar hooks existentes quando possível
- ✅ Manter o `sendPrompt()` e funções de onclick existentes
- ✅ Criar novos arquivos em `src/components/whatsapp/onboarding/`

---

## 📦 ENTREGÁVEIS

### Novos arquivos (criar):
1. `src/components/whatsapp/onboarding/WhatsAppOnboarding.tsx`
2. `src/components/whatsapp/onboarding/WelcomeScreen.tsx`
3. `src/components/whatsapp/onboarding/ProgressSteps.tsx`
4. `src/components/whatsapp/onboarding/Step1_ServerSetup.tsx`
5. `src/components/whatsapp/onboarding/Step2_InstanceSetup.tsx`
6. `src/components/whatsapp/onboarding/Step3_QRConnect.tsx`
7. `src/components/whatsapp/onboarding/SuccessScreen.tsx`
8. `src/components/whatsapp/onboarding/OnboardingSidebar.tsx`
9. `src/components/whatsapp/onboarding/ConnectionTest.tsx`
10. `src/components/whatsapp/onboarding/TypeSelector.tsx`
11. `src/components/whatsapp/onboarding/EmptyStateOnboarding.tsx`

### Arquivos a alterar (modificar):
1. `src/pages/WhatsAppPage.tsx` — Adicionar lógica condicional para wizard
2. `src/hooks/useWhatsAppInstances.ts` — Adicionar `testConnection` e `checkInstanceName`

### Arquivo a documentar (opcional):
1. `supabase/functions/whatsapp-proxy/index.ts` — Adicionar actions `test-connection` e `check-instance`

---

## ✅ CHECKLIST DE ACEITAÇÃO

- [ ] Tela de boas-vindas motiva e explica o que vai acontecer
- [ ] Selector de tipo (QR vs Oficial) é visual e explica diferenças
- [ ] Passo 1: Teste de conexão com feedback visual em tempo real
- [ ] Passo 2: Nome amigável + slug auto-gerado + validação
- [ ] Passo 3: QR Code aparece imediatamente (sem salvar antes)
- [ ] Polling automático detecta conexão e avança para success
- [ ] Sidebar de ajuda contextual presente em todos os steps
- [ ] Tela de sucesso celebra e direciona para próxima ação
- [ ] Empty state motiva a conectar (não é genérico)
- [ ] Responsivo em mobile (bottom sheet, full-width)
- [ ] Acessibilidade: labels, aria, focus rings
- [ ] Instâncias existentes continuam funcionando (cards atuais)
- [ ] Não altera schema de banco ou auth
- [ ] Novas actions na Edge Function (test-connection, check-instance)

---

## 💬 COMO USAR ESTE PROMPT

Envie este prompt INTEIRO para o Claude Code com o comando:
```
Load gstack. Implement the following WhatsApp onboarding wizard for the uPixel CRM project. Follow every specification exactly. Quality over speed. Read the attached prompt completely before starting.
```

**Anexe junto:**
1. Este prompt (este arquivo)
2. `src/pages/WhatsAppPage.tsx` (atual)
3. `src/hooks/useWhatsAppInstances.ts` (atual)
4. `src/hooks/useWhatsAppIntegration.ts` (atual)

---

## 🎬 RESUMO VISUAL DO ANTES/DEPOIS

### ANTES (Frustrante)
```
Tela vazia genérica
  → Modal com 3 campos técnicos
  → Clica "Adicionar" (sem saber se vai funcionar)
  → Card criado
  → Clica "Conectar via QR"
  → QR aparece
  → Escaneia
  → Conectado
  
Tempo: 5-10 minutos | Taxa de abandono: ALTA
```

### DEPOIS (Fluido)
```
Tela de boas-vindas animada
  → "Começar" (motivado)
  → Escolhe tipo (informado)
  → Testa servidor (confiante)
  → Nomeia instância (simples)
  → QR aparece imediatamente (direto)
  → Escaneia
  → Tela de sucesso (celebrado)
  
Tempo: 1-2 minutos | Taxa de abandono: BAIXA
```

---

*Prompt gerado por Bulma (Kimi Claw) para Israel Lemos — uPixel WhatsApp Onboarding v2.0*  
*Data: 2026-05-11*  
*Baseado em análise do fluxo atual em `WhatsAppPage.tsx`, `useWhatsAppInstances.ts`, `useWhatsAppIntegration.ts`*
