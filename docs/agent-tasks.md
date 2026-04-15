# Distribuição de Tarefas por Agente de IA — UPixel CRM

> Referência: `docs/fix-guide.md` (23 correções) · `docs/audit-report.md` (relatório completo)  
> Cada agente recebe as tarefas que correspondem aos seus pontos fortes comprovados.

---

## Por que dividir entre agentes?

Os 23 fixes cobrem três domínios técnicos completamente distintos:

| Domínio | Natureza | Melhor perfil de agente |
|---|---|---|
| Segurança criptográfica e arquitetura de auth | Raciocínio profundo, consequências não óbvias | Especialista em segurança e lógica |
| Banco de dados, migrações SQL e Edge Functions | Contexto amplo, muitos arquivos simultâneos | Contexto longo, backend/infra |
| Componentes React, UI e acessibilidade | Geração de código frontend, padrões repetitivos | Especialista em frontend/UI |

---

## Análise dos Pontos Fortes por Modelo

---

### Claude Code

**Perfil:** Raciocínio longo, segurança, arquitetura, TypeScript estrito, testes

| Ponto Forte | Por que importa neste projeto |
|---|---|
| Raciocínio sobre consequências de segurança | Os bugs críticos têm impacto em cadeia — ex: o bypass do webhook afeta todos os clientes |
| Refatoração arquitetural multi-arquivo | FIX-07 exige entender o fluxo AuthContext→AppContext→Supabase RLS de ponta a ponta |
| Escrita de testes com cobertura de edge cases | O único a modelar corretamente race conditions, inputs inesperados e falhas silenciosas |
| Criptografia e hashing | Conhece a diferença prática entre btoa, SHA-256, Argon2 e quando usar cada um |
| Integração complexa de bibliotecas | FIX-23 exige coordenar `@tanstack/react-virtual` + `@dnd-kit` sem quebrar o drag |

**Não usar para:** Tarefas repetitivas mecânicas (substituir 52 console.logs, adicionar aria-label em N botões) — desperdiça janela de contexto e custo.

---

### Gemini 2.5 Pro

**Perfil:** Janela de contexto massiva, SQL/PostgreSQL, refatoração sistemática em muitos arquivos, Edge Functions Deno

| Ponto Forte | Por que importa neste projeto |
|---|---|
| Contexto de 1M+ tokens | Pode ler todos os 11 arquivos de Edge Functions + 35 migrações simultaneamente |
| SQL avançado e RLS do PostgreSQL | FIX-08 exige escrever políticas restritivas corretas para várias tabelas |
| Refatoração sistemática em escala | FIX-11 (52 arquivos) e FIX-12 (26 ocorrências) são tarefas de busca-e-substituição inteligente |
| Deno/TypeScript para Edge Functions | FIX-05 e FIX-14 vivem no runtime Deno do Supabase, com APIs ligeiramente diferentes |
| Migrações e schema SQL | FIX-06 envolve ALTER TABLE + script de migração de dados com segurança |

**Não usar para:** Decisões de segurança crítica (pode não raciocinar sobre impacto em cadeia) e componentes React com lógica de estado complexa.

---

### Kimi Code

**Perfil:** Geração de componentes React/UI, padrões frontend repetitivos, formulários, acessibilidade visual, TailwindCSS

| Ponto Forte | Por que importa neste projeto |
|---|---|
| Geração fluente de componentes React | FIX-17, FIX-18, FIX-19 são componentes novos ou refatorados com padrão claro |
| Conhecimento de bibliotecas de UI (shadcn, Radix) | O projeto usa `cva`, `Radix UI` e `lucide-react` — Kimi gera código compatível diretamente |
| Padrões de acessibilidade em HTML/JSX | FIX-21 e FIX-22 seguem regras WCAG codificáveis como padrão, sem raciocínio profundo |
| Tarefas de escopo delimitado e repetitivo | FIX-16 (renomear chaves), FIX-13 (validação URL), FIX-09 (limite recursão) são cirúrgicos |
| Custo/velocidade para volume de tasks | Com 9 tarefas de UI, processa mais rápido e mais barato que modelos de raciocínio pesado |

**Não usar para:** Segurança, arquitetura, migrações SQL ou qualquer coisa com consequências em cadeia não óbvias.

---

## Distribuição Completa das 23 Tarefas

---

## CLAUDE CODE — 8 Tarefas

> **Tema:** Segurança crítica · Arquitetura de autenticação · Lógica complexa · Testes

---

### CLAUDE · FIX-01 — Corrigir Bypass de Verificação de Webhook Meta/WhatsApp

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts:476`  
**Por que Claude:** É uma vulnerabilidade de segurança com impacto em cadeia não óbvio. O Claude entende que remover a condição errada pode quebrar outros fluxos se não analisado com cuidado.

**Prompt para Claude Code:**
```
No arquivo supabase/functions/whatsapp-webhook/index.ts, na linha ~476,
existe um bypass de segurança na verificação do webhook da Meta:

  if (validToken || (integrations && integrations.length > 0)) {

A segunda condição torna a verificação inútil. Corrija para:

  if (validToken) {

Depois, analise o restante da função de verificação GET e confirme que
não há outro lugar onde o challenge poderia ser retornado sem validação
de token. Documente o que foi alterado com um comentário explicando o motivo.
```

---

### CLAUDE · FIX-02 — Substituir `Math.random()` por `crypto.getRandomValues()`

**Arquivos:** `src/components/integrations/ApiSettingsModal.tsx:39`, `WebhookSettingsModal.tsx:81`  
**Por que Claude:** Exige conhecimento de criptografia aplicada — não basta trocar a função, precisa entender entropia, tamanho de byte correto e criar a abstração reutilizável `src/lib/crypto.ts`.

**Prompt para Claude Code:**
```
Crie o arquivo src/lib/crypto.ts com a função generateSecureToken(prefix, byteLength)
usando crypto.getRandomValues() — criptograficamente segura.

Depois substitua o uso de Math.random() em:
- src/components/integrations/ApiSettingsModal.tsx linha ~39
- src/components/integrations/WebhookSettingsModal.tsx linha ~81

Ambos devem importar de @/lib/crypto. Explique no comentário do arquivo
por que Math.random() é inseguro para tokens de autenticação.
```

---

### CLAUDE · FIX-03 — Substituir `btoa` por Hash SHA-256

**Arquivo:** `src/components/integrations/ApiSettingsModal.tsx:45`  
**Por que Claude:** Requer entender a diferença entre codificação e hash unidirecional, implementar `crypto.subtle.digest` corretamente e alertar sobre a necessidade de revogar tokens antigos.

**Prompt para Claude Code:**
```
No arquivo src/components/integrations/ApiSettingsModal.tsx, linha ~45,
substitua:
  token_hash: btoa(token)
por uma função async hashToken(token) que usa crypto.subtle.digest("SHA-256").

A função generateToken() deve se tornar async. Adicione também um aviso
(comentário no código) explicando que tokens existentes com hash em Base64
precisam ser revogados. Não modifique a UI — apenas a lógica de geração.
```

---

### CLAUDE · FIX-04 — Sanitizar HTML de E-mail com DOMPurify

**Arquivo:** `src/components/google/GmailTab.tsx:309`  
**Por que Claude:** É uma vulnerabilidade XSS com vetor de ataque real (e-mail de phishing). O Claude entende o contexto de ataque e configura o DOMPurify com as tags e atributos corretos para esse caso específico.

**Prompt para Claude Code:**
```
No arquivo src/components/google/GmailTab.tsx, linha ~309, existe um XSS
aberto via dangerouslySetInnerHTML sem sanitização.

1. Adicione dompurify e @types/dompurify ao projeto (já instalado — apenas importe).
2. Envolva viewEmail.body com DOMPurify.sanitize() antes de renderizar.
3. Configure FORBID_TAGS para bloquear: script, style, iframe, object, embed, form.
4. Configure FORBID_ATTR para bloquear: onerror, onload, onclick, onmouseover,
   onfocus, onblur, onsubmit e todos os event handlers.
5. Adicione um comentário explicando por que este componente é alvo de XSS.
```

---

### CLAUDE · FIX-07 — Remover Fallback Hardcoded `"c1"` no AppContext

**Arquivo:** `src/contexts/AppContext.tsx:80` + `src/contexts/AuthContext.tsx`  
**Por que Claude:** Esta correção exige entender o fluxo completo de inicialização: `AuthContext` → `AppContext` → `fetchAll()`. Uma mudança errada pode criar race condition ou quebrar o carregamento de dados para todos os usuários.

**Prompt para Claude Code:**
```
Em src/contexts/AppContext.tsx linha ~80 existe:
  const clientId = userData.user?.user_metadata?.client_id || "c1";

Este fallback "c1" é um risco de isolamento de tenant.

1. Modifique AppProvider para consumir useAuth() do AuthContext.
2. Faça fetchAll() depender de user?.client_id (vindo do perfil do banco,
   não do user_metadata).
3. Se user?.client_id for null, fetchAll() não deve executar — retorne early.
4. Em AuthContext.tsx, na função fetchProfile(), remova qualquer fallback
   no campo client_id — null deve indicar erro de configuração.
5. Verifique se há race condition entre os dois contexts na inicialização
   e corrija se necessário.
```

---

### CLAUDE · FIX-10 — Corrigir Tratamento de Embedding Vazio no RAG

**Arquivo:** `supabase/functions/ai-chat/index.ts:38-44`  
**Por que Claude:** Envolve matemática vetorial (norma zero, normalização) e falha silenciosa. O Claude entende por que um vetor de zeros é matematicamente inválido para cosine similarity e por que o fallback `|| 1` não resolve o problema real.

**Prompt para Claude Code:**
```
Em supabase/functions/ai-chat/index.ts, na função generateQueryEmbedding,
existe um bug onde um embedding vazio ou com norma zero passa silenciosamente
para a busca semântica, retornando resultados incorretos.

1. Adicione validação explícita: se embedding.length === 0, lance Error.
2. Após normalizar, se norm === 0 (vetor de zeros), lance Error descritivo.
3. O catch do bloco RAG (linha ~128) já existe — ele deve capturar esses
   erros e continuar sem contexto RAG, o que é o comportamento correto.
4. Adicione um comentário explicando por que vetor zero quebra cosine similarity.
```

---

### CLAUDE · FIX-15 — Criar Cobertura de Testes nos Caminhos Críticos

**Arquivos:** `src/test/` (novos arquivos)  
**Por que Claude:** Escrever bons testes exige raciocínio sobre edge cases, race conditions e mocks corretos. O Claude modela os cenários não óbvios (embedding vazio, race condition de client_id, token duplicado).

**Prompt para Claude Code:**
```
Crie testes unitários com Vitest (já configurado no projeto) para os
seguintes caminhos críticos identificados na auditoria:

1. src/test/crypto.test.ts
   - generateSecureToken() gera tokens com prefixo correto
   - generateSecureToken() nunca repete valores em 1000 chamadas
   - hashToken() retorna hex de 64 chars (SHA-256)
   - hashToken() é determinístico para o mesmo input

2. src/test/permissions.test.ts
   - role "master" tem acesso a todas as permissions
   - role "atendente" não pode acessar crm.delete, automations.view, reports.view
   - role "vendedor" pode acessar crm.edit mas não crm.delete
   - canAccessModule retorna false para rotas desconhecidas com role sem permissão

3. src/test/webhookUrl.test.ts
   - isValidWebhookUrl rejeita "https://" (sem host)
   - isValidWebhookUrl rejeita URLs com localhost
   - isValidWebhookUrl rejeita HTTP (não HTTPS)
   - isValidWebhookUrl aceita URL válida com domínio real

Mocke useAuth onde necessário com vi.mock.
```

---

### CLAUDE · FIX-23 — Virtualização do Kanban com `@tanstack/react-virtual`

**Arquivo:** `src/components/crm/KanbanColumn.tsx`  
**Por que Claude:** Integrar virtualização com `@dnd-kit` é tecnicamente complexo — posicionamento `absolute` quebra a detecção de drop targets do dnd-kit. O Claude raciocina sobre a solução correta para manter o drag funcional após virtualizar.

**Prompt para Claude Code:**
```
Em src/components/crm/KanbanColumn.tsx, o mapa de leads renderiza todos os
cards no DOM simultaneamente, causando degradação com 50+ leads.

1. Instale e configure @tanstack/react-virtual (useVirtualizer).
2. Implemente a virtualização mantendo o scroll suave.
3. ATENÇÃO: o posicionamento absolute dos itens virtualizados pode quebrar
   a detecção de droppable areas do @dnd-kit. Analise o código de DnD
   existente em CRMPage.tsx e ajuste o DragOverlay e os droppable containers
   para que o drag-and-drop continue funcionando após a virtualização.
4. Teste mentalmente: arrastar do item 1 para o item 50 deve funcionar mesmo
   com o item 50 não estando no DOM antes do início do drag.
```

---

## GEMINI 2.5 PRO — 6 Tarefas

> **Tema:** SQL/PostgreSQL · Edge Functions Deno · Refatoração sistemática em escala

---

### GEMINI · FIX-05 — Corrigir Bug de Reconexão WhatsApp

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts:518-521`  
**Por que Gemini:** Bug isolado em Edge Function Deno. O Gemini lida bem com o runtime Deno e o contexto do arquivo inteiro de 543 linhas.

**Prompt para Gemini:**
```
No arquivo supabase/functions/whatsapp-webhook/index.ts, no handler do
evento "connection.update" (linha ~512), existe este código:

  await adminClient.from("integrations").update({ status: newStatus })
    .eq("provider", "whatsapp")
    .eq("status", "connected")   // BUG: só atualiza se já "connected"
    .filter("config->>instance_name", "eq", instanceName);

O filtro .eq("status", "connected") impede que integrações no estado
"disconnected" sejam atualizadas para "connected" na reconexão.

Remova o filtro .eq("status", "connected"). Mantenha todos os outros
filtros. Não altere mais nada no arquivo.
```

---

### GEMINI · FIX-06 — Migrar Notas e Campos do `localStorage` para o Supabase

**Arquivos:** `src/pages/LeadProfilePage.tsx` + nova migração SQL  
**Por que Gemini:** Envolve criar migração SQL com ALTER TABLE, script de migração de dados existentes e reescrever a camada de persistência. O Gemini tem contexto para ler o arquivo inteiro de LeadProfilePage e a migration existente ao mesmo tempo.

**Prompt para Gemini:**
```
Contexto: src/pages/LeadProfilePage.tsx usa localStorage para salvar notas
de leads (chave "totum_notes") e campos customizados (chave
"totum_custom_fields_{id}"). Esses dados são perdidos ao trocar de device.

Tarefas:

1. Crie o arquivo supabase/migrations/20260416_lead_notes_custom_fields.sql:
   - ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes_local TEXT
   - ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'
   - Adicione comentários nas colunas

2. Em LeadProfilePage.tsx:
   - Substitua todas as leituras de localStorage por queries ao Supabase
   - Substitua todas as escritas de localStorage por updates ao Supabase
   - Adicione um useEffect de migração única que lê as chaves "totum_*"
     antigas, salva no banco e as remove do localStorage

3. Não altere a UI, apenas a camada de persistência.

Leia o arquivo completo antes de editar para entender o fluxo de estado.
```

---

### GEMINI · FIX-08 — Adicionar Verificação de `is_blocked` no RLS

**Arquivo:** Nova migração SQL  
**Por que Gemini:** Pura tarefa de PostgreSQL — criação de função `SECURITY DEFINER`, políticas `RESTRICTIVE` e aplicação em múltiplas tabelas. O Gemini é superior em SQL complexo e conhece os padrões de RLS do Supabase.

**Prompt para Gemini:**
```
Crie o arquivo supabase/migrations/20260416_blocked_user_rls.sql.

O objetivo é garantir que usuários com is_blocked = TRUE no banco não
possam acessar dados mesmo com JWT ativo (bypass de frontend).

1. Crie a função auth.is_user_blocked() com SECURITY DEFINER que retorna
   TRUE se o usuário autenticado (auth.uid()) tiver is_blocked = TRUE.

2. Aplique políticas RESTRICTIVE (não permissive) do tipo:
   USING (NOT auth.is_user_blocked())
   nas seguintes tabelas: leads, pipeline_columns, tasks, conversations,
   messages, timeline_events, automations, automation_rules.

3. Use CREATE POLICY IF NOT EXISTS para evitar conflito com migrações
   existentes. Nomeie as políticas como "blocked_users_no_access_{tabela}".

4. Adicione um comentário no topo do arquivo explicando por que políticas
   RESTRICTIVE são necessárias (diferença de PERMISSIVE).
```

---

### GEMINI · FIX-11 — Remover os 52 `console.*` de Produção

**Arquivos:** 17 arquivos em `src/` + `supabase/functions/`  
**Por que Gemini:** Tarefa de busca-e-substituição inteligente em muitos arquivos simultâneos. O contexto massivo do Gemini permite processar todos os 17 arquivos de uma vez sem perder o fio.

**Prompt para Gemini:**
```
No projeto UPixel CRM, existem 52 instâncias de console.log/error/warn
espalhadas em 17 arquivos que precisam ser substituídas.

1. Crie o arquivo src/lib/logger.ts com o wrapper de logging:
   - Em DEV: chama console.* normalmente
   - Em PROD: silencia logs, captura errors via Sentry (import.meta.env.DEV)
   - Exporte: logger.log(), logger.warn(), logger.error()

2. Nos arquivos abaixo, substitua TODOS os console.* pelo logger equivalente:
   src/contexts/AppContext.tsx
   src/hooks/useBroadcast.ts
   src/hooks/useInstagramIntegration.ts
   src/hooks/useInbox.ts
   src/hooks/usePushNotifications.ts
   src/hooks/useRagContext.ts
   src/components/chat/RagContextInjector.tsx
   src/components/intelligence/KnowledgeBaseTab.tsx
   src/components/intelligence/AgentsTab.tsx
   src/components/intelligence/AssistantTab.tsx
   src/components/integrations/WebhookSettingsModal.tsx
   src/components/integrations/ApiSettingsModal.tsx
   src/components/profile/OrganizationSection.tsx
   src/components/whatsapp/broadcast/RechargeModal.tsx
   src/pages/IntegrationsPage.tsx
   src/pages/NotFound.tsx
   src/main.tsx

3. Nos Edge Functions em supabase/functions/, NÃO substitua — os console.*
   do Deno são logs de servidor, não browser. Apenas remova os que logam
   dados sensíveis (corpo de webhook, números de telefone, tokens).
```

---

### GEMINI · FIX-12 — Eliminar os 26 Usos de `(supabase.from as any)`

**Arquivos:** 5 arquivos em `src/`  
**Por que Gemini:** Requer gerar os tipos do Supabase (`supabase gen types`), depois reescrever 26 chamadas mantendo a lógica idêntica. O Gemini processa os 5 arquivos afetados de uma vez com contexto completo.

**Prompt para Gemini:**
```
No projeto UPixel CRM, 26 instâncias de (supabase.from as any) precisam
ser removidas. Isso existe porque o cliente Supabase não está tipado.

1. O arquivo de tipos já existe ou deve ser gerado em:
   src/integrations/supabase/database.types.ts
   (se não existir, crie um stub tipado manualmente com as tabelas
   api_keys, webhook_endpoints, automations, automation_rules)

2. Atualize src/integrations/supabase/client.ts para usar:
   createClient<Database>(url, key)

3. Nos 5 arquivos abaixo, substitua cada (supabase.from as any)("tabela")
   por supabase.from("tabela") — TypeScript deve aceitar sem cast após
   a tipagem do cliente:
   - src/contexts/AppContext.tsx (12 ocorrências)
   - src/components/intelligence/AgentsTab.tsx (5 ocorrências)
   - src/components/integrations/WebhookSettingsModal.tsx (4 ocorrências)
   - src/components/integrations/ApiSettingsModal.tsx (4 ocorrências)
   - src/components/alexandria/RAGIntegrationStatus.tsx (1 ocorrência)

4. Se alguma tabela não estiver nos tipos gerados, adicione ao stub
   manualmente — não use (as any) como solução.
```

---

### GEMINI · FIX-14 — Restringir CORS nas 11 Edge Functions

**Arquivos:** Todos os arquivos em `supabase/functions/*/index.ts`  
**Por que Gemini:** Tarefa idêntica aplicada em 11 arquivos simultaneamente. O Gemini carrega todos de uma vez, cria o arquivo compartilhado e aplica o padrão em cada função sem perder contexto entre elas.

**Prompt para Gemini:**
```
Todas as 11 Edge Functions do projeto têm CORS wildcard:
  "Access-Control-Allow-Origin": "*"

1. Crie supabase/functions/_shared/cors.ts com a função getCorsHeaders(req)
   que valida a origin contra uma lista de domínios permitidos definida
   em variável de ambiente ALLOWED_ORIGINS (fallback: array hardcoded com
   placeholder "https://SEU_DOMINIO.com").

2. Nos seguintes arquivos, substitua o objeto corsHeaders local pela
   chamada getCorsHeaders(req):
   - ai-chat/index.ts
   - rag-embed/index.ts
   - rag-search/index.ts
   - whatsapp-webhook/index.ts
   - whatsapp-proxy/index.ts
   - instagram-webhook/index.ts
   - instagram-proxy/index.ts
   - google-oauth/index.ts
   - asaas-payment/index.ts
   - asaas-webhook/index.ts
   - send-push/index.ts

3. O import deve ser: import { getCorsHeaders } from "../_shared/cors.ts"
4. Adicione no README ou comentário: o dev precisa configurar ALLOWED_ORIGINS
   no painel do Supabase antes do deploy.
```

---

## KIMI CODE — 9 Tarefas

> **Tema:** Componentes React/UI · Acessibilidade · Formulários · Padrões frontend repetitivos

---

### KIMI · FIX-09 — Corrigir Recursão Sem Limite no Parser de E-mail

**Arquivo:** `src/components/google/GmailTab.tsx:100`  
**Por que Kimi:** Fix cirúrgico de 3 linhas em componente React. Sem impacto arquitetural.

**Prompt para Kimi Code:**
```
Em src/components/google/GmailTab.tsx, a função processPart (linha ~100)
chama a si mesma recursivamente sem limite de profundidade.

Adicione um parâmetro depth = 0 e retorne early se depth > 10:

  const processPart = (part: any, depth = 0) => {
    if (depth > 10) return;
    if (part.mimeType === "text/plain" && part.body?.data) plain = decode(part.body.data);
    if (part.mimeType === "text/html" && part.body?.data) html = decode(part.body.data);
    if (part.parts) part.parts.forEach((p: any) => processPart(p, depth + 1));
  };

Não altere mais nada no arquivo.
```

---

### KIMI · FIX-13 — Validar URL de Webhook Mais Rigorosamente

**Arquivo:** `src/components/integrations/WebhookSettingsModal.tsx:71`  
**Por que Kimi:** Criação de função utilitária simples de validação de URL em componente React.

**Prompt para Kimi Code:**
```
Em src/components/integrations/WebhookSettingsModal.tsx, linha ~71,
a validação atual é:
  if (!url.startsWith("https://")) { ... }

Substitua por uma função isValidWebhookUrl(url: string): boolean que:
- Usa new URL(url) dentro de try/catch
- Exige protocol === "https:"
- Exige hostname com pelo menos um ponto (domínio real)
- Rejeita "localhost", "127.x.x.x" e "192.168.x.x"
- Retorna false em qualquer exceção

Atualize a validação no handleSave() para usar essa função.
A mensagem de erro deve ser: "Informe uma URL HTTPS válida com domínio completo."
```

---

### KIMI · FIX-16 — Renomear Chaves `totum_*` para `upixel_*` no localStorage

**Arquivo:** `src/pages/LeadProfilePage.tsx`  
**Por que Kimi:** Busca-e-substituição simples em um único arquivo. Executar ANTES do FIX-06.

**Prompt para Kimi Code:**
```
Em src/pages/LeadProfilePage.tsx, todas as referências a chaves de
localStorage com prefixo "totum_" devem ser renomeadas para "upixel_":

- "totum_notes" → "upixel_notes"
- "totum_custom_fields_${id}" → "upixel_custom_fields_${id}"

Adicione um bloco de migração automática no useEffect de inicialização
que executa UMA vez:
1. Lê as chaves "totum_*" antigas
2. Se existirem, copia os valores para "upixel_*"
3. Remove as chaves "totum_*"

Isso garante que usuários com dados existentes não os percam.
```

---

### KIMI · FIX-17 — Implementar React Hook Form + Zod no LeadFormModal

**Arquivo:** `src/components/crm/LeadFormModal.tsx`  
**Por que Kimi:** Substituição de estado local por RHF+Zod é um padrão de formulário React bem definido. Kimi gera o código de formulário rapidamente seguindo o padrão shadcn/ui.

**Prompt para Kimi Code:**
```
Em src/components/crm/LeadFormModal.tsx, o formulário usa useState manual.
Substitua por React Hook Form + Zod (ambos já instalados no projeto).

1. Crie o schema Zod:
   - name: string, min 2 chars, obrigatório
   - email: string email, opcional
   - phone: string, opcional
   - company: string, opcional
   - value: number positivo, opcional

2. Substitua useState<Partial<Lead>> por useForm com zodResolver.

3. Em cada campo Input, use {...register("campo")} e exiba o erro assim:
   {errors.campo && (
     <p className="text-xs text-destructive mt-1">{errors.campo.message}</p>
   )}
   O Input deve ter className com "border-destructive" quando tiver erro.

4. O botão de submit deve ser type="submit" com disabled={isSubmitting}.

5. Mantenha a mesma UI visual — apenas a lógica de validação muda.
Use os componentes existentes do projeto (Input, Button, Label do shadcn/ui).
```

---

### KIMI · FIX-18 — Adicionar Máscaras de Input e `inputMode` Correto

**Arquivos:** `src/components/crm/LeadFormModal.tsx`, `src/pages/LeadProfilePage.tsx`  
**Por que Kimi:** Integração de biblioteca de máscara (react-imask) em campos de formulário React — tarefa puramente de UI.

**Prompt para Kimi Code:**
```
Instale react-imask e aplique máscaras nos formulários do projeto:

1. Em src/components/crm/LeadFormModal.tsx:
   - Campo telefone: máscara "(00) 00000-0000" com inputMode="tel"
   - Campo valor: máscara numérica com separador de milhar ".", decimal ","
     e inputMode="decimal"

2. Em src/pages/LeadProfilePage.tsx:
   - Aplique os mesmos inputMode nos campos correspondentes se existirem

Use IMaskInput do react-imask com onAccept para integrar com React Hook Form
(setValue do useForm). O componente deve ter as mesmas classes CSS dos
Input do shadcn/ui existentes no projeto para manter consistência visual.

Não quebre a integração com React Hook Form implementada no FIX-17.
```

---

### KIMI · FIX-19 — Criar Componente `<EmptyState />` Genérico

**Arquivo:** `src/components/ui/empty-state.tsx` (novo)  
**Por que Kimi:** Criação de componente React novo com interface clara e aplicação em pontos específicos do Kanban. Tarefa de UI pura.

**Prompt para Kimi Code:**
```
Crie o componente src/components/ui/empty-state.tsx com as seguintes props:
- icon: ReactNode
- title: string
- description?: string
- action?: { label: string; onClick: () => void }
- className?: string

Use cn() do @/lib/utils para classes. O componente deve ter:
- role="status" e aria-label={title} para acessibilidade
- Estilo com border-dashed, bg-secondary/5, rounded-2xl
- Ícone centralizado em container rounded-2xl bg-secondary/20
- Título em text-sm font-bold
- Descrição em text-xs text-muted-foreground max-w-[240px]
- Botão de ação como link de texto text-primary hover:underline

Depois aplique em 2 lugares:
1. src/components/crm/KanbanColumn.tsx: quando leads.length === 0,
   com ícone Users, título "Nenhum lead nesta etapa"
2. src/pages/CRMPage.tsx: quando filteredLeads.length === 0 após filtro,
   com ícone SearchX, título "Nenhum lead encontrado"
```

---

### KIMI · FIX-20 — Configurar `TouchSensor` para DnD Mobile

**Arquivo:** `src/pages/CRMPage.tsx`  
**Por que Kimi:** Configuração de sensores do @dnd-kit — adição de importações e parâmetros em um único hook `useSensors`. Tarefa delimitada de frontend.

**Prompt para Kimi Code:**
```
Em src/pages/CRMPage.tsx, o hook useSensors usa apenas PointerSensor,
o que causa conflito com scroll em dispositivos touch.

Adicione TouchSensor e KeyboardSensor:

import { PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

Substitua o useSensors existente por esse. Não altere mais nada no arquivo.
```

---

### KIMI · FIX-21 — Adicionar `aria-label` em Botões de Ícone

**Arquivos:** `KanbanColumn.tsx`, `CRMPage.tsx`, `AppSidebar.tsx`, `ApiSettingsModal.tsx`, `WebhookSettingsModal.tsx`  
**Por que Kimi:** Adição sistemática de atributos HTML em padrão repetitivo. Kimi aplica o padrão em múltiplos arquivos rapidamente.

**Prompt para Kimi Code:**
```
Nos arquivos abaixo, todo <Button size="icon"> que contém APENAS um ícone
SVG sem texto deve receber aria-label descritivo. O ícone SVG deve receber
aria-hidden="true".

Aplique nas seguintes ocorrências:

src/components/crm/KanbanColumn.tsx:
- Botão deletar coluna → aria-label={`Deletar coluna ${column.name}`}
- Botão editar coluna → aria-label={`Editar coluna ${column.name}`}
- Botão adicionar lead → aria-label={`Adicionar lead em ${column.name}`}

src/pages/CRMPage.tsx:
- Botão de filtros → aria-label="Abrir filtros"
- Botão exportar → aria-label="Exportar leads"

src/components/layout/AppSidebar.tsx:
- Botão recolher/expandir sidebar → aria-label dinâmico baseado no estado

src/components/integrations/ApiSettingsModal.tsx:
- Botão copiar token → aria-label="Copiar chave de API"

src/components/integrations/WebhookSettingsModal.tsx:
- Botão mostrar/ocultar secret → aria-label dinâmico:
  showSecretId === wh.id ? "Ocultar webhook secret" : "Mostrar webhook secret"

Não altere nenhuma outra propriedade dos botões.
```

---

### KIMI · FIX-22 — Corrigir Hierarquia Semântica HTML no Layout

**Arquivo:** `src/components/layout/AppLayout.tsx`  
**Por que Kimi:** Substituição de `<div>` por elementos semânticos HTML5 — mudança estrutural simples de markup sem lógica envolvida.

**Prompt para Kimi Code:**
```
Em src/components/layout/AppLayout.tsx, substitua as divs estruturais
por elementos semânticos HTML5:

1. A div que contém AppSidebar → <nav aria-label="Menu principal">
2. A div que contém o header/topbar → <header>
3. A div que contém o conteúdo principal (children) →
   <main id="main-content" tabIndex={-1}>

2. Antes de todo o layout (primeiro filho do componente), adicione
   o skip link acessível:
   <a
     href="#main-content"
     className="sr-only focus:not-sr-only focus:absolute focus:top-4
                focus:left-4 focus:z-50 focus:px-4 focus:py-2
                focus:bg-primary focus:text-primary-foreground
                focus:rounded-md focus:text-sm focus:font-medium"
   >
     Ir para o conteúdo principal
   </a>

Mantenha todas as classes CSS existentes — apenas troque as tags HTML.
```

---

## Resumo Visual da Distribuição

```
╔══════════════════════════════════════════════════════════════════╗
║  CLAUDE CODE — 8 tarefas                                        ║
║  Segurança · Arquitetura · Lógica complexa · Testes             ║
╠══════════════════════════════════════════════════════════════════╣
║  FIX-01  Bypass webhook Meta (segurança crítica)                ║
║  FIX-02  crypto.getRandomValues + lib/crypto.ts                 ║
║  FIX-03  Hash SHA-256 para token de API                         ║
║  FIX-04  DOMPurify no GmailTab (XSS)                           ║
║  FIX-07  Remover fallback "c1" (isolamento de tenant)           ║
║  FIX-10  Embedding vazio no RAG                                 ║
║  FIX-15  Testes unitários (edge cases críticos)                 ║
║  FIX-23  Virtualização Kanban + compatibilidade dnd-kit         ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  GEMINI 2.5 PRO — 6 tarefas                                     ║
║  SQL · Edge Functions · Refatoração sistemática em escala       ║
╠══════════════════════════════════════════════════════════════════╣
║  FIX-05  Bug reconexão WhatsApp (Edge Function)                 ║
║  FIX-06  localStorage → Supabase (migração SQL + dados)         ║
║  FIX-08  RLS is_blocked (PostgreSQL / políticas restritivas)    ║
║  FIX-11  Remover 52 console.logs (17 arquivos)                  ║
║  FIX-12  Remover 26 (as any) (tipagem Supabase)                 ║
║  FIX-14  CORS restrito (11 Edge Functions)                      ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  KIMI CODE — 9 tarefas                                          ║
║  Componentes React · UI · Acessibilidade · Formulários          ║
╠══════════════════════════════════════════════════════════════════╣
║  FIX-09  Recursão sem limite no parser de e-mail                ║
║  FIX-13  Validação de URL de webhook                            ║
║  FIX-16  Renomear totum_* → upixel_*                            ║
║  FIX-17  React Hook Form + Zod no LeadFormModal                 ║
║  FIX-18  Máscaras de input (react-imask)                        ║
║  FIX-19  Componente <EmptyState /> genérico                     ║
║  FIX-20  TouchSensor + KeyboardSensor no DnD                    ║
║  FIX-21  aria-label em botões de ícone (WCAG 4.1.2)             ║
║  FIX-22  Semântica HTML no AppLayout + skip link                ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Dependências entre Tarefas

Algumas tarefas devem ser concluídas em ordem para evitar conflitos:

```
FIX-16 (renomear totum_*) deve rodar ANTES de FIX-06 (migrar ao Supabase)
FIX-02 (criar lib/crypto.ts)  deve rodar ANTES de FIX-03 (usar hashToken)
FIX-17 (RHF+Zod no formulário) deve rodar ANTES de FIX-18 (máscaras)
FIX-12 (tipagem Supabase)      pode rodar em paralelo com qualquer outro
FIX-08 (RLS is_blocked SQL)    deve rodar ANTES de FIX-07 (frontend client_id)
```

---

## Ordem de Execução Sugerida entre Agentes

```
DIA 1  │ Claude: FIX-01, FIX-04          │ Gemini: FIX-05           │ Kimi: FIX-09, FIX-16
DIA 2  │ Claude: FIX-02, FIX-03          │ Gemini: FIX-08           │ Kimi: FIX-13, FIX-21
DIA 3  │ Claude: FIX-07, FIX-10          │ Gemini: FIX-06           │ Kimi: FIX-22, FIX-20
DIA 4  │ Claude: FIX-15                  │ Gemini: FIX-11, FIX-12   │ Kimi: FIX-17, FIX-18
DIA 5  │ Claude: FIX-23                  │ Gemini: FIX-14           │ Kimi: FIX-19
```
