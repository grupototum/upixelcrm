# PROMPT DE IMPLANTAÇÃO — uPixel WhatsApp "One-Click Connect" v3.0

## 📋 CONTEXTO

**Projeto:** uPixel CRM — Conexão WhatsApp simplificada (arquitetura gerenciada)  
**Arquivos base:** `src/pages/WhatsAppPage.tsx`, `src/hooks/useWhatsAppInstances.ts`, `src/hooks/useWhatsAppIntegration.ts`  
**Nível:** 🔬 Teste → 🚀 Produção (alteração de arquitetura — testar rigorosamente)  
**Stack:** React 18 + TypeScript + Tailwind + shadcn/ui + Supabase + Evolution API  
**Sistema:** Vibe Coding Totum v3.0

**Missão:** Transformar a conexão WhatsApp de um processo técnico (URL + API Key + instância) em um **"one-click"**: usuário clica "Adicionar WhatsApp", o uPixel cria a instância automaticamente no servidor gerenciado, e mostra o QR Code. Zero campos técnicos visíveis.

---

## 🔍 ANÁLISE DO SCREENSHOT (Whaticket)

O whaticket mostra:
```
┌─────────────────────────────────────────┐
│  × Adicionar número                      │
│                                         │
│  ┌──────────────┐ ┌────────────────┐     │
│  │ QR Code      │ │ API Oficial    │     │
│  │ Via Evolution│ │ Meta Business  │     │
│  │ API          │ │                │     │
│  └──────────────┘ └────────────────┘     │
│                                         │
│  URL do Servidor Evolution API          │
│  [https://api.evolution.com.br____]    │
│                                         │
│  Nome da Instância                      │
│  [meu-numero-1___________________]    │
│  Identificador único...                 │
│                                         │
│  Evolution API Key                      │
│  [Sua API Key____________________]    │
│                                         │
│              [Cancelar]  [Adicionar]   │
└─────────────────────────────────────────┘
```

**Problemas dessa interface (que o uPixel vai eliminar):**
1. Usuário precisa **saber o que é Evolution API**
2. Precisa ter **próprio servidor** (URL)
3. Precisa **gerenciar API Key**
4. Precisa **nomear instância técnica** (slug)

---

## 🏗️ NOVA ARQUITETURA: "EVOLUTION GERENCIADO"

### Conceito Central

O uPixel possui **um servidor Evolution API compartilhado** (ou um cluster) que gerencia instâncias de múltiplos tenants. O usuário nunca interage diretamente com o Evolution — o uPixel faz isso por ele.

```
ANTES (cada usuário gerencia):
┌─────────────┐     ┌──────────────────┐
│  Usuário    │────▶│ Servidor Evolution│
│  (URL+Key)  │     │  (próprio)        │
└─────────────┘     └──────────────────┘

DEPOIS (uPixel gerencia):
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Usuário    │────▶│   uPixel     │────▶│ Servidor Evolution│
│  (só clica) │     │  (gerencia)  │     │  (compartilhado)  │
└─────────────┘     └──────────────┘     └──────────────────┘
                              │
                              ▼
                    ┌──────────────┐
                    │   Supabase    │
                    │  (metadados)  │
                    └──────────────┘
```

### Isolamento por Tenant

Cada tenant (empresa/usuário) só vê suas instâncias. O uPixel adiciona um prefixo ou metadata `tenant_id` para isolar no servidor Evolution:

```
Servidor Evolution (compartilhado):
├── instância: "tenant_abc123_vendas" ← Tenant A
├── instância: "tenant_abc123_suporte" ← Tenant A
├── instância: "tenant_xyz789_principal" ← Tenant B
└── instância: "tenant_xyz789_backup" ← Tenant B
```

O usuário vê:
- "Vendas" (não vê o prefixo técnico)
- "Suporte"

---

## 🎯 FLUXO IDEAL DO USUÁRIO

### Cenário 1: Primeira vez (nenhuma instância)

```
Usuário entra em Configurações > WhatsApp

┌─────────────────────────────────────────┐
│                                         │
│  📱 Conecte seu WhatsApp                │
│                                         │
│  Receba e responda mensagens do         │
│  WhatsApp direto no uPixel.             │
│  Automatize, organize e converta        │
│  mais clientes.                         │
│                                         │
│  [🚀 Conectar WhatsApp →]               │
│                                         │
│  💡 Leva menos de 1 minuto              │
│  Não precisa instalar nada              │
│                                         │
└─────────────────────────────────────────┘

  ↓ Clica "Conectar"

┌─────────────────────────────────────────┐
│                                         │
│  📲 Escaneie o QR Code                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │        [QR CODE AQUI]           │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  1. Abra o WhatsApp no celular          │
│  2. Menu ⋮ > Dispositivos conectados   │
│  3. Conectar dispositivo                │
│  4. Aponte a câmera para o QR           │
│                                         │
│  [🔄 Gerar novo QR]                     │
│                                         │
│  ⏱️ O QR se atualiza a cada 30 seg      │
│                                         │
└─────────────────────────────────────────┘

  ↓ Escaneia no celular

┌─────────────────────────────────────────┐
│                                         │
│  ✅ WhatsApp conectado!                 │
│                                         │
│  Número: (31) 91234-5678               │
│                                         │
│  [💬 Ir para Inbox]                     │
│  [🤖 Criar resposta automática]         │
│  [➕ Conectar outro número]              │
│                                         │
└─────────────────────────────────────────┘
```

**Tempo total: 30-60 segundos**

### Cenário 2: Já tem instâncias (adicionar mais)

```
┌─────────────────────────────────────────┐
│  WhatsApp                              │
│  2 números conectados                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Vendas Principal                 │   │
│  │  (31) 91234-5678 ● Conectado      │   │
│  │  [⚙️]  [🗑️]                       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Suporte Técnico                  │   │
│  │  (31) 98765-4321 ● Conectado      │   │
│  │  [⚙️]  [🗑️]                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [➕ Conectar outro WhatsApp]            │
│                                         │
└─────────────────────────────────────────┘

  ↓ Clica "Conectar outro"

┌─────────────────────────────────────────┐
│  Nomeie este WhatsApp (opcional)        │
│                                         │
│  [Vendas 2________________________]     │
│                                         │
│  [Continuar →]                          │
│                                         │
│  💡 Exemplos: "Vendas", "Suporte",      │
│     "Marketing", "Nome do vendedor"     │
│                                         │
└─────────────────────────────────────────┘

  ↓ Clica "Continuar"

┌─────────────────────────────────────────┐
│  📲 Escaneie o QR Code                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        [QR CODE]                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

## 📐 COMPONENTES A CRIAR

### Novos arquivos (12 componentes):

```
src/components/whatsapp/
├── onboarding/
│   ├── QuickConnectWizard.tsx          ← Container principal (simplificado)
│   ├── EmptyStateWhatsApp.tsx          ← Tela inicial motivadora
│   ├── QRConnectScreen.tsx             ← QR Code (geração + polling)
│   ├── SuccessConnectScreen.tsx        ← Conectado! (com direcionamento)
│   └── InstanceNameInput.tsx           ← Input de nome amigável (opcional)
│
├── instances/
│   ├── InstanceCardV2.tsx              ← Card redesenhado (mais visual)
│   ├── InstanceList.tsx                ← Lista de instâncias conectadas
│   └── InstanceActions.tsx             ─ Ações (desconectar, excluir, renomear)
│
└── shared/
    ├── WhatsAppStatusBadge.tsx         ← Badge de status visual
    ├── ConnectionPolling.tsx           ← Lógica de polling reutilizável
    └── QRCodeDisplay.tsx               ─ Display de QR Code com timer
```

### Arquivos a alterar (3):

```
src/pages/WhatsAppPage.tsx              ← Nova lógica: empty state + wizard
src/hooks/useWhatsAppInstances.ts       ← Ocultar campos técnicos
supabase/functions/whatsapp-proxy/      ← Nova action: create-managed-instance
```

---

## 🔧 DETALHAMENTO DOS COMPONENTES

### 1. QuickConnectWizard.tsx (Container)

**Estado interno ultra-simplificado:**
```typescript
type WizardStep = "empty" | "confirm" | "qr" | "success";

interface WizardState {
  step: WizardStep;
  instanceName: string;        // Nome amigável (ex: "Vendas")
  qrCodeData: string | null;   // Base64 do QR
  status: "idle" | "generating" | "connecting" | "connected" | "error";
  connectedNumber: string;      // Número que conectou
  errorMessage: string | null;
}
```

**Props:**
```typescript
interface QuickConnectWizardProps {
  onComplete: (instance: WaInstance) => void;
  onCancel: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│  HEADER                                  │
│  [Logo] Conectar WhatsApp  [×]         │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │                                    │ │
│  │        CONTEÚDO DO STEP           │ │
│  │        (muda conforme step)       │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  FOOTER                                  │
│  [← Voltar]              [Próximo →]    │
│  (desabilitado quando aplicável)         │
└─────────────────────────────────────────┘
```

---

### 2. EmptyStateWhatsApp.tsx

**Quando aparece:** Usuário ainda não tem nenhuma instância.

**Copy:**
```
📱 Conecte seu WhatsApp

Receba e responda mensagens do WhatsApp
direto no uPixel. Automatize, organize
e converta mais clientes.

┌─────────────────────────────────────────┐
│  O que você vai conseguir:              │
│                                         │
│  💬 Receber mensagens no inbox           │
│  💻 Responder pelo computador            │
│  🤖 Automatizar respostas              │
│  📊 Ver relatórios de conversão         │
│  👥 Atribuir conversas à equipe         │
│                                         │
└─────────────────────────────────────────┘

[🚀 Conectar WhatsApp →]

💡 Leva menos de 1 minuto
   Não precisa instalar nada
   Não precisa de servidor próprio
```

**Elementos visuais:**
- Ilustração/ícone grande de WhatsApp + computador
- 5 cards de benefício em grid (2 colunas mobile, 3 desktop)
- Botão primário GRANDE com ícone de WhatsApp
- Microcopy abaixo desmistificando ("Não precisa de servidor")
- Animação sutil no ícone (pulse leve)

---

### 3. InstanceNameInput.tsx (Opcional — Passo intermediário)

**Quando aparece:** Após clicar "Conectar" (antes do QR).

**Copy:**
```
Nomeie este WhatsApp (opcional)

Isso ajuda você a organizar se tiver
vários números conectados.

┌─────────────────────────────────────────┐
│  [Vendas Principal______________]      │
│  Placeholder: "Meu WhatsApp"           │
└─────────────────────────────────────────┘

[🚀 Gerar QR Code →]

💡 Exemplos: "Vendas", "Suporte",
   "Marketing", "João - Comercial"

[🔄 Pular e usar nome padrão]
```

**Comportamento:**
- Input opcional (pode deixar vazio)
- Se vazio: sistema gera nome padrão "WhatsApp [número]"
- Validação: máx 30 caracteres
- Botão "Pular" em tom mais claro (ghost)
- Botão primário "Gerar QR Code" habilitado sempre (pois é opcional)

---

### 4. QRConnectScreen.tsx (Passo principal)

**Objetivo:** Mostrar QR Code + instruções + polling automático.

**Copy:**
```
📲 Escaneie com seu celular

Aponte a câmera do WhatsApp para o QR Code abaixo.

┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │        [QR CODE AQUI]           │    │
│  │                                 │    │
│  │    ┌───────────────────────┐    │    │
│  │    │  ⏳ Gerando QR...     │    │    │
│  │    │  Só mais alguns       │    │    │
│  │    │  segundos             │    │    │
│  │    └───────────────────────┘    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ⏱️ QR Code atualiza automaticamente      │
│     a cada 30 segundos                   │
│                                          │
│  [🔄 Gerar novo QR Code]                 │
│                                          │
├─────────────────────────────────────────┤
│  Como escanear:                          │
│  1. Abra o WhatsApp no celular           │
│  2. Toque no menu ⋮ (3 pontinhos)        │
│  3. "Dispositivos conectados"             │
│  4. "Conectar dispositivo"                │
│  5. Aponte a câmera para o QR            │
│                                          │
│  💡 Seu celular precisa estar com         │
│     internet para funcionar              │
└─────────────────────────────────────────┘
```

**Comportamento:**

1. **Ao entrar no step:**
   ```
   Chamar Edge Function: create-managed-instance
   Body: { name: "Vendas Principal" (ou padrão), tenant_id: "abc123" }
   ```

2. **Resposta esperada:**
   ```json
   {
     "success": true,
     "instance_id": "tenant_abc123_vendas_principal_xxxx",
     "instance_name": "Vendas Principal",
     "qr_code": "data:image/png;base64,iVBORw0KGgo...",
     "expires_at": "2026-05-11T16:00:00Z"
   }
   ```

3. **Exibição:**
   - QR Code em card branco (bg white) para scanner funcionar
   - Borda animada (pulse) em volta do QR
   - Timer regressivo: "Expira em 00:28"
   - Quando expira: fade out + "Gerando novo QR..." + novo QR

4. **Polling de conexão:**
   ```javascript
   // A cada 3 segundos
   const interval = setInterval(async () => {
     const status = await checkInstanceStatus(instanceId);
     if (status.connected) {
       clearInterval(interval);
       showSuccessScreen(status.phoneNumber);
     }
   }, 3000);
   ```

5. **Estados visuais:**
   | Estado | Visual |
   |---|---|
   | Gerando QR | Spinner centralizado + "Gerando QR Code..." |
   | QR pronto | QR exibido + timer + instruções |
   | Escaneado (aguardando confirmação) | "Aguardando confirmação do WhatsApp..." |
   | Conectado | Fade para SuccessScreen |
   | Erro | Card vermelho + mensagem + botão "Tentar novamente" |

---

### 5. SuccessConnectScreen.tsx

**Copy:**
```
🎉 WhatsApp conectado!

Seu número (31) 91234-5678 agora está
recebendo mensagens no uPixel.

┌─────────────────────────────────────────┐
│  O que fazer agora:                     │
│                                         │
│  💬 [Ir para o Inbox →]                 │
│     Ver mensagens e responder           │
│                                         │
│  🤖 [Criar automação →]                 │
│     Resposta automática fora de horário │
│                                         │
│  ➕ [Conectar outro WhatsApp]            │
│     Tenha vários números no mesmo lugar │
│                                         │
└─────────────────────────────────────────┘

💡 Dica: Configure uma resposta automática
   para não perder nenhum lead à noite!
```

**Elementos:**
- Animação: checkmark grande com confetti ou pulse
- Número conectado em destaque
- 3 CTAs em cards clicáveis
- Dica contextual no rodapé
- Timer: "Você será redirecionado para o Inbox em 5... 4... 3..." (cancelável)

---

### 6. InstanceCardV2.tsx (Card redesenhado)

**Visual:**
```
┌─────────────────────────────────────────┐
│                                         │
│  📱 Vendas Principal                    │
│  (31) 91234-5678                        │
│                                         │
│  ● Conectado há 2 horas                 │
│                                         │
│  [⚙️ Configurar]  [🗑️ Remover]          │
│                                         │
│  ├─ 142 mensagens hoje                  │
│  ├─ 8 leads novos                       │
│  └─ 3 conversas pendentes               │
│                                         │
└─────────────────────────────────────────┘
```

**Diferenças do card atual:**
- Nome amigável em destaque (não nome técnico da instância)
- Número do celular visível
- Status com ícone de pulso (online)
- Mini estatísticas da instância (mensagens, leads)
- Sem mostrar URL do servidor (oculto)
- Sem mostrar nome técnico (oculto)
- Sem mostrar API Key (obviamente oculto)

---

## 🔧 ALTERAÇÕES NO BACKEND

### 1. Supabase Edge Function (whatsapp-proxy)

**Nova action: `create-managed-instance`**

```typescript
// Recebe via body:
{
  "tenant_id": "uuid-do-tenant",
  "name": "Vendas Principal",        // Nome amigável (opcional)
  "type": "evolution"                 // Sempre evolution no modo gerenciado
}

// Processo:
1. Gera instance_name técnico: `${tenant_id}_${slugify(name)}_${random(4)}`
2. Chama Evolution API interno: POST /instance/create
   Headers: { apikey: UPIXEL_GLOBAL_API_KEY }
   Body: { instanceName: instance_name_tecnico }
3. Aguarda QR Code ser gerado
4. Retorna:
{
  "success": true,
  "instance_id": "uuid-interno",
  "instance_name_technical": "tenant_abc123_vendas_principal_xxxx",
  "instance_name_friendly": "Vendas Principal",
  "qr_code": "base64...",
  "status": "connecting",
  "expires_at": "2026-05-11T16:00:00Z"
}
```

**Nova action: `check-managed-status`**
```typescript
// Recebe via query:
?action=check-managed-status&instance_id=uuid

// Retorna:
{
  "connected": true,
  "phone_number": "(31) 91234-5678",
  "status": "open",
  "profile_picture": "url..."  // opcional
}
```

**Nova action: `list-managed-instances`**
```typescript
// Recebe via query:
?action=list-managed-instances&tenant_id=uuid

// Retorna array filtrado por tenant_id:
[
  {
    "id": "uuid",
    "name": "Vendas Principal",           // Nome amigável
    "phone_number": "(31) 91234-5678",
    "status": "connected",
    "created_at": "2026-05-11T14:00:00Z"
  }
]
```

**Variável de ambiente necessária:**
```
UPIXEL_EVOLUTION_API_URL=https://evolution.totum.systems
UPIXEL_EVOLUTION_API_KEY=chave-global-secreta
```

### 2. Banco de Dados (Supabase)

**Nova tabela: `whatsapp_instances`** (se não existir)

```sql
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  -- Campos visíveis ao usuário
  name TEXT NOT NULL,                    -- "Vendas Principal"
  
  -- Campos técnicos (ocultos)
  evolution_instance_name TEXT NOT NULL, -- "tenant_abc123_vendas_principal_xxxx"
  evolution_server_url TEXT NOT NULL,    -- URL do servidor (padrão para todos)
  status TEXT DEFAULT 'connecting',      -- connecting, connected, disconnected, error
  phone_number TEXT,                     -- preenchido após conectar
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- RLS
  CONSTRAINT valid_status CHECK (status IN ('connecting', 'connected', 'disconnected', 'error'))
);

-- RLS Policy: tenants só veem suas instâncias
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON whatsapp_instances
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### 3. Hook useWhatsAppInstances.ts (Simplificado)

```typescript
export interface WhatsAppInstance {
  id: string;
  name: string;           // Nome amigável (ex: "Vendas")
  phone_number: string;   // (31) 91234-5678
  status: "connecting" | "connected" | "disconnected" | "error";
  created_at: string;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar instâncias do tenant atual
  const loadInstances = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "whatsapp-proxy?action=list-managed-instances"
    );
    if (error) {
      toast.error("Erro ao carregar instâncias");
      setInstances([]);
    } else {
      setInstances(data || []);
    }
    setLoading(false);
  }, []);

  // Criar nova instância (retorna QR Code)
  const createInstance = useCallback(async (name: string) => {
    const { data, error } = await supabase.functions.invoke(
      "whatsapp-proxy?action=create-managed-instance",
      { body: { name } }
    );
    if (error) throw new Error(error.message);
    return data; // { instance_id, qr_code, status }
  }, []);

  // Verificar status (polling)
  const checkStatus = useCallback(async (instanceId: string) => {
    const { data, error } = await supabase.functions.invoke(
      `whatsapp-proxy?action=check-managed-status&instance_id=${instanceId}`
    );
    if (error) throw new Error(error.message);
    return data; // { connected, phone_number, status }
  }, []);

  // Remover instância
  const deleteInstance = useCallback(async (instanceId: string) => {
    const { error } = await supabase.functions.invoke(
      `whatsapp-proxy?action=delete-managed-instance&instance_id=${instanceId}`
    );
    if (error) throw new Error(error.message);
    await loadInstances();
  }, [loadInstances]);

  return {
    instances,
    loading,
    refresh: loadInstances,
    createInstance,
    checkStatus,
    deleteInstance,
  };
}
```

---

## 🎨 INTERFACE FINAL: WhatsAppPage.tsx

### Estado A: Nenhuma instância (empty state)

```typescript
// NOVA LÓGICA SIMPLIFICADA
export default function WhatsAppPage() {
  const { instances, loading, refresh, createInstance, checkStatus } = useWhatsAppInstances();
  const [showWizard, setShowWizard] = useState(false);

  // Empty state
  if (!loading && instances.length === 0) {
    return (
      <AppLayout title="WhatsApp">
        <EmptyStateWhatsApp onConnect={() => setShowWizard(true)} />
      </AppLayout>
    );
  }

  // Wizard modal
  if (showWizard) {
    return (
      <AppLayout title="WhatsApp">
        <QuickConnectWizard
          onComplete={(instance) => {
            refresh();
            setShowWizard(false);
            // Opcional: redirecionar para inbox
          }}
          onCancel={() => setShowWizard(false)}
        />
      </AppLayout>
    );
  }

  // Lista de instâncias
  return (
    <AppLayout
      title="WhatsApp"
      subtitle={`${instances.length} número${instances.length > 1 ? 's' : ''} conectado${instances.length > 1 ? 's' : ''}`}
      actions={
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4" /> Conectar outro
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances.map((inst) => (
          <InstanceCardV2
            key={inst.id}
            instance={inst}
            onDelete={() => refresh()}
          />
        ))}
      </div>
    </AppLayout>
  );
}
```

---

## 🔄 FLUXO COMPLETO (SIMPLIFICADO)

```
Usuário entra em WhatsApp
  → Nenhuma instância?
    → Mostra EmptyStateWhatsApp
    → Clica "Conectar WhatsApp"
      → Mostra InstanceNameInput (opcional)
      → Clica "Gerar QR"
        → Chama create-managed-instance
        → Sistema:
          1. Gera nome técnico interno
          2. Cria instância no Evolution gerenciado
          3. Retorna QR Code
        → Mostra QRConnectScreen
        → Usuário escaneia no celular
        → Polling detecta conexão (a cada 3s)
        → Mostra SuccessConnectScreen
        → Redireciona para Inbox (ou fica na lista)
```

**Sem:**
- ❌ URL do servidor
- ❌ API Key
- ❌ Nome técnico da instância
- ❌ Escolha de tipo (por enquanto só QR Code / Evolution)
- ❌ Botão "Adicionar" + depois "Conectar"

---

## ⚠️ CONSIDERAÇÕES TÉCNICAS IMPORTANTES

### 1. Servidor Evolution Gerenciado

**Opção A: uPixel roda próprio servidor**
- Deploy do Evolution API em um VPS/cloud
- uPixel gerencia o servidor (atualizações, monitoramento)
- API Key global armazenada em variável de ambiente segura
- Cada tenant = instâncias isoladas por naming convention

**Opção B: Serviço de terceiro (Evolution as a Service)**
- Contratar serviço que hospeda Evolution API
- uPixel consome via API
- Menos manutenção, custo recorrente

**Recomendação:** Começar com Opção A para controle total.

### 2. Segurança

- API Key do Evolution NUNCA exposta ao frontend
- Variáveis de ambiente no Supabase Edge Functions
- Tenant isolation via naming + RLS no banco
- Rate limiting na criação de instâncias (evitar abuse)

### 3. Escalabilidade

- Um servidor Evolution suporta N instâncias
- Monitorar consumo de recursos
- Quando atingir limite: spin up novo servidor
- Load balancer entre múltiplos servidores Evolution

### 4. Fallback

Se o servidor Evolution gerenciado falhar:
```
┌─────────────────────────────────────────┐
│  ⚠️ Servidor temporariamente ocupado     │
│                                         │
│  Estamos gerando seu QR Code.           │
│  Aguarde alguns instantes...            │
│                                         │
│  [🔄 Tentar novamente]                  │
│                                         │
│  💡 Se o problema persistir, use        │
│     seu próprio servidor:               │
│     [Configurar servidor próprio →]     │
│     (modo avançado)                     │
└─────────────────────────────────────────┘
```

---

## 📦 ENTREGÁVEIS

### Novos arquivos (12):
1. `src/components/whatsapp/onboarding/QuickConnectWizard.tsx`
2. `src/components/whatsapp/onboarding/EmptyStateWhatsApp.tsx`
3. `src/components/whatsapp/onboarding/QRConnectScreen.tsx`
4. `src/components/whatsapp/onboarding/SuccessConnectScreen.tsx`
5. `src/components/whatsapp/onboarding/InstanceNameInput.tsx`
6. `src/components/whatsapp/instances/InstanceCardV2.tsx`
7. `src/components/whatsapp/instances/InstanceList.tsx`
8. `src/components/whatsapp/instances/InstanceActions.tsx`
9. `src/components/whatsapp/shared/WhatsAppStatusBadge.tsx`
10. `src/components/whatsapp/shared/ConnectionPolling.tsx`
11. `src/components/whatsapp/shared/QRCodeDisplay.tsx`

### Arquivos a alterar (3):
1. `src/pages/WhatsAppPage.tsx` — Nova lógica simplificada
2. `src/hooks/useWhatsAppInstances.ts` — Novo hook simplificado
3. `supabase/functions/whatsapp-proxy/index.ts` — Novas actions

### Documentação:
1. `docs/EVOLUTION_SETUP.md` — Como configurar servidor Evolution gerenciado

---

## ✅ CHECKLIST DE ACEITAÇÃO

- [ ] Usuário clica "Conectar WhatsApp" e não vê campos técnicos
- [ ] Sistema cria instância automaticamente no servidor gerenciado
- [ ] QR Code aparece em até 5 segundos
- [ ] Polling automático detecta conexão
- [ ] Tela de sucesso mostra número conectado
- [ ] Lista de instâncias mostra nome amigável (não técnico)
- [ ] Cards não mostram URL, API Key ou nome técnico
- [ ] Tenant isolation funciona (usuário A não vê instâncias do B)
- [ ] Edge Functions têm variáveis de ambiente seguras
- [ ] Fallback para modo avançado (servidor próprio) disponível
- [ ] Responsivo em mobile
- [ ] Acessibilidade: labels, focus, aria-live

---

## 💬 COMO USAR ESTE PROMPT

Envie para o Claude Code:
```
Load gstack. Implement the following "One-Click WhatsApp Connect" feature for uPixel CRM. This is an architectural change — the system must manage an Evolution API server internally so users never see URLs or API Keys. Follow every specification exactly. Quality over speed.
```

**Anexe:**
1. Este prompt
2. `src/pages/WhatsAppPage.tsx` (atual)
3. `src/hooks/useWhatsAppInstances.ts` (atual)
4. Screenshot do whaticket (referência visual)

---

*Prompt gerado por Bulma (Kimi Claw) para Israel Lemos — uPixel "One-Click WhatsApp" v3.0*  
*Data: 2026-05-11*  
*Inspiração: Screenshot do whaticket (fluxo simplificado) + pedido de eliminação total de campos técnicos*
