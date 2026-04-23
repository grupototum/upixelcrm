# Guia de Correções — UPixel CRM

> Referência: `docs/audit-report.md`  
> Cada item tem o arquivo exato, o trecho problemático, a correção e o comando para verificar.

---

## Prioridade 1 — Segurança Crítica (Fazer Hoje)

---

### FIX-01 · Corrigir Bypass de Verificação de Webhook Meta/WhatsApp

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`  
**Linha:** ~476  
**Tempo estimado:** 5 minutos

#### Problema

```typescript
// ANTES — vulnerável
if (validToken || (integrations && integrations.length > 0)) {
  return new Response(challenge || "", { status: 200, headers: corsHeaders });
}
```

A segunda condição faz com que qualquer token seja aceito enquanto houver integrações cadastradas.

#### Correção

```typescript
// DEPOIS — correto
if (validToken) {
  return new Response(challenge || "", { status: 200, headers: corsHeaders });
}
return new Response("Forbidden", { status: 403, headers: corsHeaders });
```

#### Como verificar

Após o deploy, envie uma requisição GET para a URL da função com um `hub.verify_token` inválido e confirme que recebe `403 Forbidden`.

```bash
curl -X GET "https://<seu-projeto>.supabase.co/functions/v1/whatsapp-webhook\
?hub.mode=subscribe\
&hub.verify_token=token_invalido\
&hub.challenge=teste123"
# Esperado: HTTP 403 Forbidden
```

---

### FIX-02 · Substituir `Math.random()` por `crypto.getRandomValues()` nos Tokens

**Arquivos:**
- `src/components/integrations/ApiSettingsModal.tsx` — linha ~39
- `src/components/integrations/WebhookSettingsModal.tsx` — linha ~81

**Tempo estimado:** 15 minutos

#### Problema

```typescript
// ANTES — inseguro
const token = "sk_live_" + Array.from({ length: 32 }, () =>
  Math.random().toString(36)[2] || '0'
).join('');
```

#### Correção em `ApiSettingsModal.tsx`

```typescript
// DEPOIS — seguro
function generateSecureToken(prefix: string, byteLength: number): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return prefix + Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// No lugar da linha antiga:
const token = generateSecureToken("sk_live_", 24); // 48 chars hex
const preview = token.slice(0, 12) + "..." + token.slice(-4);
```

#### Correção em `WebhookSettingsModal.tsx`

```typescript
// No lugar da linha antiga:
const secret = generateSecureToken("wh_sec_", 16); // 32 chars hex
```

> **Dica:** Extraia `generateSecureToken` para `src/lib/crypto.ts` e importe nos dois arquivos para não duplicar o código.

#### Como verificar

Gere 5 tokens consecutivos no frontend e confirme que nenhum se repete e que todos têm exatamente o comprimento esperado.

---

### FIX-03 · Substituir `btoa` por Hash SHA-256 no Armazenamento de Token de API

**Arquivo:** `src/components/integrations/ApiSettingsModal.tsx`  
**Linha:** ~45  
**Tempo estimado:** 30 minutos

#### Problema

```typescript
// ANTES — reversível, inseguro
token_hash: btoa(token),
```

#### Correção

```typescript
// DEPOIS — hash unidirecional
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Dentro de generateToken(), tornar a função async:
const tokenHash = await hashToken(token);

const { data: row, error } = await (supabase.from as any)("api_keys").insert({
  name: newKeyName,
  token_preview: preview,
  token_hash: tokenHash, // hash SHA-256 irreversível
  active: true,
}).select().single();
```

> **Atenção:** Após essa mudança, os tokens existentes no banco têm `token_hash` em Base64. Você precisa gerar novamente as chaves existentes ou rodar um script de migração que recalcule os hashes. Avise os usuários que suas chaves antigas serão revogadas.

#### Como verificar

1. Gere uma nova chave no frontend.
2. Abra o Supabase Studio → tabela `api_keys`.
3. Confirme que a coluna `token_hash` contém uma string hexadecimal de 64 caracteres (SHA-256) e não mais um Base64 curto.

---

### FIX-04 · Sanitizar HTML de E-mail com DOMPurify

**Arquivo:** `src/components/google/GmailTab.tsx`  
**Linha:** ~309  
**Tempo estimado:** 20 minutos

#### Instalar dependência

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

#### Problema

```typescript
// ANTES — XSS aberto
<div dangerouslySetInnerHTML={{ __html: viewEmail.body }} />
```

#### Correção

```typescript
// No topo do arquivo, adicionar import:
import DOMPurify from 'dompurify';

// No lugar da linha problemática:
<div
  className="email-content text-sm text-foreground/90 leading-relaxed overflow-x-hidden pt-2"
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(viewEmail.body, {
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    }),
  }}
/>
```

#### Como verificar

1. No Gmail conectado ao CRM, envie para si mesmo um e-mail com o conteúdo:
   ```html
   <img src=x onerror="document.title='XSS'">
   ```
2. Abra o e-mail no CRM.
3. O título da página **não deve mudar**. Se mudar, a sanitização não funcionou.

---

### FIX-05 · Corrigir Bug de Reconexão WhatsApp (Status Preso)

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`  
**Linha:** ~518-522  
**Tempo estimado:** 5 minutos

#### Problema

```typescript
// ANTES — só atualiza se já estiver "connected"
await adminClient.from("integrations").update({ status: newStatus })
  .eq("provider", "whatsapp")
  .eq("status", "connected")     // BUG: bloqueia reconexão
  .filter("config->>instance_name", "eq", instanceName);
```

#### Correção

```typescript
// DEPOIS — atualiza independente do status atual
await adminClient.from("integrations").update({ status: newStatus })
  .eq("provider", "whatsapp")
  .filter("config->>instance_name", "eq", instanceName);
```

#### Como verificar

1. Desconecte a instância WhatsApp do painel da Evolution API.
2. Confirme que o status no CRM muda para "disconnected".
3. Reconecte a instância.
4. Confirme que o status volta para "connected" automaticamente em até 30 segundos.

---

## Prioridade 2 — Bugs de Lógica e Integridade (Esta Semana)

---

### FIX-06 · Migrar Notas e Campos Customizados do `localStorage` para o Supabase

**Arquivo:** `src/pages/LeadProfilePage.tsx`  
**Linhas:** 48, 63, 107, 310, 331  
**Tempo estimado:** 3 horas

#### Problema

Notas e campos customizados de leads são salvos apenas no `localStorage` do browser, com chaves usando o prefixo desatualizado `totum_`. Dados são perdidos ao trocar de dispositivo.

#### Passo 1 — Criar migração SQL

Crie o arquivo `supabase/migrations/20260416_lead_notes_custom_fields.sql`:

```sql
-- Adiciona coluna de notas e campos customizados à tabela de leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS notes_local TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Habilita RLS para as novas colunas (herda da tabela)
COMMENT ON COLUMN leads.notes_local IS 'Notas livres do lead, migradas do localStorage';
COMMENT ON COLUMN leads.custom_fields IS 'Campos customizados do lead em formato JSON';
```

```bash
supabase db push
```

#### Passo 2 — Atualizar `LeadProfilePage.tsx`

```typescript
// REMOVER todas as linhas com localStorage.getItem/setItem referentes a notas e campos

// SUBSTITUIR a leitura de notas por:
const [notes, setNotes] = useState<Note[]>([]);
useEffect(() => {
  if (!id) return;
  supabase
    .from("leads")
    .select("notes_local, custom_fields")
    .eq("id", id)
    .single()
    .then(({ data }) => {
      if (data?.notes_local) {
        setNotes(JSON.parse(data.notes_local));
      }
      if (data?.custom_fields) {
        setCustomFields(data.custom_fields);
      }
    });
}, [id]);

// SUBSTITUIR a escrita de notas por:
const saveNotes = async (updated: Note[]) => {
  setNotes(updated);
  await supabase
    .from("leads")
    .update({ notes_local: JSON.stringify(updated) })
    .eq("id", id);
};

// SUBSTITUIR a escrita de campos customizados por:
const saveCustomField = async (updated: Record<string, string>) => {
  setCustomFields(updated);
  await supabase
    .from("leads")
    .update({ custom_fields: updated })
    .eq("id", id);
};
```

#### Passo 3 — Migrar dados existentes (script opcional)

Se usuários já têm dados no `localStorage` do browser atual, crie um script de migração único que leia e salve no banco na primeira vez que o componente montar:

```typescript
// Dentro do useEffect de inicialização — executar UMA vez
const migrateFromLocalStorage = async () => {
  const oldNotes = localStorage.getItem("totum_notes");
  const oldFields = localStorage.getItem(`totum_custom_fields_${id}`);
  if (!oldNotes && !oldFields) return;

  await supabase.from("leads").update({
    notes_local: oldNotes || null,
    custom_fields: oldFields ? JSON.parse(oldFields) : {},
  }).eq("id", id);

  // Limpar localStorage após migração
  localStorage.removeItem("totum_notes");
  localStorage.removeItem(`totum_custom_fields_${id}`);
};
await migrateFromLocalStorage();
```

---

### FIX-07 · Remover Fallback Hardcoded `"c1"` no AppContext

**Arquivo:** `src/contexts/AppContext.tsx:80`  
**Tempo estimado:** 1 hora

#### Problema

```typescript
// ANTES — fallback inseguro
const clientId = userData.user?.user_metadata?.client_id || "c1";
```

#### Correção

O `client_id` deve vir do perfil autenticado via `AuthContext`, não dos metadados mutáveis do usuário.

**Passo 1:** Conectar `AppContext` ao `AuthContext`

```typescript
// Em AppProvider, importar useAuth
import { useAuth } from "@/contexts/AuthContext";

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // usuário já validado com perfil do banco

  const fetchAll = useCallback(async () => {
    // Aguarda usuário estar disponível
    if (!user?.client_id) return;
    const clientId = user.client_id; // vem do perfil do banco, não de user_metadata
    // ... resto do código
  }, [user?.client_id]);
```

**Passo 2:** Adicionar validação no `AuthContext` para garantir que `client_id` do perfil existe:

```typescript
// Em fetchProfile(), linha ~57
return {
  id: data.id,
  name: data.name || "",
  email: data.email || "",
  role: (data.role as AuthUser["role"]) || "vendedor",
  avatar: data.avatar_url || undefined,
  is_blocked: data.is_blocked || false,
  client_id: data.client_id, // NÃO usar fallback aqui — null indica erro de configuração
  organization_id: orgId || null,
  organization,
};
```

---

### FIX-08 · Adicionar Verificação de `is_blocked` no RLS do Banco

**Arquivo:** Nova migração SQL  
**Tempo estimado:** 1 hora

#### Problema

Usuários bloqueados com sessão JWT ativa podem fazer requisições diretas ao Supabase por até 1 hora (duração padrão do JWT).

#### Solução

Criar migração `supabase/migrations/20260416_blocked_user_rls.sql`:

```sql
-- Função auxiliar que verifica se o usuário autenticado está bloqueado
CREATE OR REPLACE FUNCTION auth.is_user_blocked()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_blocked = TRUE
  );
END;
$$;

-- Atualizar políticas RLS principais para incluir verificação de bloqueio
-- Exemplo para tabela leads:
CREATE POLICY "blocked_users_cannot_read_leads"
  ON leads
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (NOT auth.is_user_blocked());

-- Repetir para todas as tabelas sensíveis:
-- pipeline_columns, tasks, conversations, messages, timeline_events, etc.
```

```bash
supabase db push
```

---

### FIX-09 · Corrigir Recursão Sem Limite no Parser de E-mail

**Arquivo:** `src/components/google/GmailTab.tsx:100`  
**Tempo estimado:** 20 minutos

#### Problema

```typescript
// ANTES — sem limite de profundidade
const processPart = (part: any) => {
  if (part.mimeType === "text/html" && part.body?.data) html = decode(part.body.data);
  if (part.parts) part.parts.forEach(processPart);
};
```

#### Correção

```typescript
// DEPOIS — com limite de profundidade
const processPart = (part: any, depth = 0) => {
  if (depth > 10) return; // limite de segurança
  if (part.mimeType === "text/plain" && part.body?.data) plain = decode(part.body.data);
  if (part.mimeType === "text/html" && part.body?.data) html = decode(part.body.data);
  if (part.parts) part.parts.forEach((p: any) => processPart(p, depth + 1));
};
```

---

### FIX-10 · Corrigir Tratamento de Embedding Vazio no RAG

**Arquivo:** `supabase/functions/ai-chat/index.ts:38-44`  
**Tempo estimado:** 10 minutos

#### Problema

```typescript
// ANTES — vetor de zeros passa para busca silenciosamente
while (embedding.length < 384) embedding.push(0);
const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
```

#### Correção

```typescript
// DEPOIS — falha explicitamente se embedding for inválido
if (!Array.isArray(embedding) || embedding.length === 0) {
  throw new Error("Modelo retornou embedding inválido (array vazio)");
}
if (embedding.length > 384) embedding = embedding.slice(0, 384);
while (embedding.length < 384) embedding.push(0);

const norm = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0));
if (norm === 0) {
  throw new Error("Embedding com norma zero — vetor inválido para busca semântica");
}
return embedding.map((v: number) => v / norm);
```

---

## Prioridade 3 — Qualidade e Manutenção (Este Mês)

---

### FIX-11 · Remover os 52 Console Statements de Produção

**Tempo estimado:** 2 horas

#### Passo 1 — Instalar Sentry para logging em produção

```bash
npm install @sentry/react @sentry/vite-plugin
```

#### Passo 2 — Configurar Sentry em `src/main.tsx`

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

Adicionar `VITE_SENTRY_DSN=https://...` no `.env`.

#### Passo 3 — Criar wrapper de logging em `src/lib/logger.ts`

```typescript
import * as Sentry from "@sentry/react";

const isDev = import.meta.env.DEV;

export const logger = {
  log: (msg: string, ...args: unknown[]) => {
    if (isDev) console.log(msg, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (isDev) console.warn(msg, ...args);
    else Sentry.captureMessage(msg, "warning");
  },
  error: (msg: string, error?: unknown) => {
    if (isDev) console.error(msg, error);
    else Sentry.captureException(error ?? new Error(msg));
  },
};
```

#### Passo 4 — Substituir todos os `console.*`

```bash
# Encontrar todos os arquivos com console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" -l
```

Substituir manualmente `console.error(...)` por `logger.error(...)` e `console.log(...)` por `logger.log(...)` em cada arquivo identificado.

#### Passo 5 — Adicionar regra ESLint para prevenir regressão

No `eslint.config.js` (ou `.eslintrc`):

```javascript
rules: {
  "no-console": ["error", { allow: [] }],
}
```

---

### FIX-12 · Eliminar os 26 Usos de `(supabase.from as any)`

**Tempo estimado:** 3 horas

#### Passo 1 — Gerar tipos TypeScript do schema do Supabase

```bash
supabase gen types typescript --project-id <seu-project-id> > src/integrations/supabase/database.types.ts
```

#### Passo 2 — Tipar o cliente Supabase em `src/integrations/supabase/client.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

#### Passo 3 — Remover os casts `as any`

Após tipagem, `supabase.from("api_keys")` já é tipado corretamente. Remova todos os `(supabase.from as any)`:

```typescript
// ANTES
const { data, error } = await (supabase.from as any)("api_keys").select("*");

// DEPOIS
const { data, error } = await supabase.from("api_keys").select("*");
```

Se a tabela não existir nos tipos gerados, rode `supabase db push` primeiro para garantir que as migrações foram aplicadas.

---

### FIX-13 · Validar URL de Webhook Mais Rigorosamente

**Arquivo:** `src/components/integrations/WebhookSettingsModal.tsx:71`  
**Tempo estimado:** 20 minutos

#### Problema

```typescript
// ANTES — só verifica o prefixo
if (!url.startsWith("https://")) {
  toast.error("A URL do Webhook deve usar HTTPS.");
  return;
}
```

#### Correção

```typescript
// DEPOIS — valida URL completa
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.length > 0 &&
      parsed.hostname !== "localhost" &&
      !parsed.hostname.startsWith("127.") &&
      !parsed.hostname.startsWith("192.168.")
    );
  } catch {
    return false;
  }
}

// Substituir a validação existente:
if (!isValidWebhookUrl(url)) {
  toast.error("Informe uma URL HTTPS válida com domínio completo.");
  return;
}
```

---

### FIX-14 · Restringir CORS nas Edge Functions

**Arquivos:** Todos os 11 arquivos em `supabase/functions/*/index.ts`  
**Tempo estimado:** 1 hora

#### Problema

```typescript
// ANTES — aceita qualquer origem
"Access-Control-Allow-Origin": "*",
```

#### Correção

Criar arquivo compartilhado `supabase/functions/_shared/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  "https://seu-dominio.com",
  "https://app.seu-dominio.com",
  // Adicionar domínios de staging se necessário
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}
```

Substituir em cada Edge Function:

```typescript
// ANTES
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ...
};

// DEPOIS
import { getCorsHeaders } from "../_shared/cors.ts";

// Dentro do handler:
const corsHeaders = getCorsHeaders(req);
```

---

### FIX-15 · Adicionar Cobertura de Testes Básica

**Tempo estimado:** 4 horas

#### Passo 1 — Configurar Vitest (já instalado)

O `vitest.config.ts` existe. Criar os primeiros testes nos caminhos críticos:

**`src/test/generateSecureToken.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { generateSecureToken } from "@/lib/crypto";

describe("generateSecureToken", () => {
  it("gera tokens com o prefixo correto", () => {
    const token = generateSecureToken("sk_live_", 24);
    expect(token).toMatch(/^sk_live_[0-9a-f]{48}$/);
  });

  it("gera tokens únicos a cada chamada", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken("sk_", 16)));
    expect(tokens.size).toBe(100);
  });
});
```

**`src/test/permissions.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";

describe("usePermissions", () => {
  it("master tem acesso a tudo", () => {
    // mock do useAuth retornando role "master"
    // verificar hasPermission retorna true para qualquer permission
  });

  it("atendente não pode deletar leads", () => {
    // mock role "atendente"
    // verificar hasPermission("crm.delete") === false
  });
});
```

#### Passo 2 — Rodar testes

```bash
npm run test
# ou para watch mode:
npm run test -- --watch
```

---

### FIX-16 · Renomear Chaves `totum_*` do localStorage

**Arquivo:** `src/pages/LeadProfilePage.tsx`  
**Tempo estimado:** 15 minutos (antes de implementar FIX-06)

Se optar por manter temporariamente o `localStorage` antes de migrar ao banco, pelo menos renomeie as chaves para evitar confusão:

```typescript
// ANTES
localStorage.getItem("totum_notes")
localStorage.setItem("totum_notes", ...)
localStorage.getItem(`totum_custom_fields_${id}`)
localStorage.setItem(`totum_custom_fields_${id}`, ...)

// DEPOIS
localStorage.getItem("upixel_notes")
localStorage.setItem("upixel_notes", ...)
localStorage.getItem(`upixel_custom_fields_${id}`)
localStorage.setItem(`upixel_custom_fields_${id}`, ...)
```

> Adicione um script de migração automática que lê as chaves `totum_*` antigas, copia para `upixel_*` e remove as antigas, garantindo que usuários com dados existentes não os percam.

---

## Prioridade 4 — UX/UI e Acessibilidade (Este Mês)

---

### FIX-17 · Implementar React Hook Form + Zod no LeadFormModal

**Arquivo:** `src/components/crm/LeadFormModal.tsx`  
**Tempo estimado:** 2 horas

#### Problema

O formulário de criação de leads usa `useState<Partial<Lead>>` com validação apenas no botão (`disabled={!form.name?.trim()}`). O usuário não sabe por que o botão está bloqueado nem quais campos estão incorretos.

#### Passo 1 — Instalar dependências (já presentes no `package.json`)

```bash
# react-hook-form e zod já estão instalados — apenas confirmar
npm list react-hook-form zod @hookform/resolvers
```

#### Passo 2 — Criar schema de validação

```typescript
// src/components/crm/LeadFormModal.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().email("Informe um e-mail válido").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  value: z.number({ invalid_type_error: "Informe um valor numérico" }).min(0).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;
```

#### Passo 3 — Substituir o estado local pelo hook

```typescript
// ANTES — estado manual
const [form, setForm] = useState<Partial<Lead>>({});

// DEPOIS — React Hook Form com validação Zod
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset,
} = useForm<LeadFormData>({
  resolver: zodResolver(leadSchema),
  defaultValues: editingLead ?? {},
});
```

#### Passo 4 — Exibir erros inline abaixo de cada campo

```typescript
// Padrão a aplicar em cada Input com possível erro:
<div className="space-y-1">
  <Input
    {...register("name")}
    placeholder="Nome do lead"
    className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
  />
  {errors.name && (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {errors.name.message}
    </p>
  )}
</div>
```

#### Passo 5 — Substituir o botão de submit

```typescript
// ANTES
<Button onClick={handleSubmit} disabled={!form.name?.trim()}>Salvar Lead</Button>

// DEPOIS — botão de submit nativo com estado de loading
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
  Salvar Lead
</Button>
```

#### Como verificar

1. Abra o modal de criação de lead.
2. Clique em "Salvar" sem preencher nada — deve aparecer a mensagem de erro abaixo do campo Nome.
3. Preencha um e-mail inválido (`nome@`) — deve aparecer "Informe um e-mail válido".
4. Preencha todos os campos corretamente — nenhuma mensagem de erro, botão habilitado.

---

### FIX-18 · Adicionar Máscaras de Input e `inputMode` Correto

**Arquivos:** `src/components/crm/LeadFormModal.tsx`, `src/pages/LeadProfilePage.tsx`  
**Tempo estimado:** 1 hora

#### Instalar biblioteca de máscara

```bash
npm install react-imask
```

#### Correção em campos de telefone

```typescript
import { IMaskInput } from "react-imask";

// ANTES
<Input
  placeholder="Telefone"
  value={form.phone}
  onChange={(e) => setForm({ ...form, phone: e.target.value })}
/>

// DEPOIS — com máscara e teclado correto em mobile
<IMaskInput
  mask={[{ mask: "(00) 0000-0000" }, { mask: "(00) 00000-0000" }]}
  inputMode="tel"
  placeholder="(11) 99999-9999"
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  onAccept={(value) => setValue("phone", value)}
/>
```

#### Correção em campos de valor monetário

```typescript
// ANTES
<Input placeholder="Valor" type="text" />

// DEPOIS
<IMaskInput
  mask={Number}
  scale={2}
  signed={false}
  thousandsSeparator="."
  radix=","
  inputMode="decimal"
  placeholder="R$ 0,00"
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  onAccept={(value) => setValue("value", Number(value))}
/>
```

#### Tabela de `inputMode` por tipo de campo

| Campo | `inputMode` |
|---|---|
| Telefone | `tel` |
| Valor monetário | `decimal` |
| CPF/CNPJ | `numeric` |
| E-mail | `email` |
| URL | `url` |
| Texto livre | omitir (padrão `text`) |

---

### FIX-19 · Criar Componente `<EmptyState />` Genérico

**Arquivo:** `src/components/ui/empty-state.tsx` (novo)  
**Tempo estimado:** 1 hora

#### Criar o componente

```typescript
// src/components/ui/empty-state.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        "rounded-2xl border-2 border-dashed border-border/30 bg-secondary/5",
        className
      )}
      role="status"
      aria-label={title}
    >
      <div className="h-16 w-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[240px] mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-semibold text-primary hover:underline underline-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

#### Aplicar no Kanban quando não há leads

```typescript
// src/components/crm/KanbanColumn.tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

// Dentro da coluna, quando leads.length === 0:
{leads.length === 0 && (
  <EmptyState
    icon={<Users className="h-7 w-7" />}
    title="Nenhum lead nesta etapa"
    description="Arraste um lead para cá ou crie um novo."
    action={{ label: "Criar lead", onClick: onAddLead }}
  />
)}
```

#### Aplicar na busca global quando sem resultados

```typescript
// src/pages/CRMPage.tsx — quando filteredLeads.length === 0
import { SearchX } from "lucide-react";

<EmptyState
  icon={<SearchX className="h-7 w-7" />}
  title="Nenhum lead encontrado"
  description={`Sua busca por "${searchTerm}" não retornou resultados. Tente outros termos ou remova os filtros.`}
  action={{ label: "Limpar filtros", onClick: handleClearFilters }}
/>
```

---

### FIX-20 · Configurar `TouchSensor` para Drag-and-Drop Mobile

**Arquivo:** `src/pages/CRMPage.tsx`  
**Tempo estimado:** 30 minutos

#### Problema

```typescript
// ANTES — só PointerSensor, conflita com scroll mobile
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
);
```

#### Correção

```typescript
import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// DEPOIS — sensor dedicado para touch com delay de 200ms
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,       // Desktop: exige 8px de movimento para iniciar drag
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,        // Mobile: usuário precisa segurar 200ms para iniciar drag
      tolerance: 5,      // Permite até 5px de movimento durante o delay sem cancelar
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // Suporte a drag por teclado (a11y)
  })
);
```

#### Como verificar

1. Abra o CRM num smartphone ou no DevTools com modo responsivo ativado.
2. Tente rolar o Kanban com o dedo — **não deve** iniciar o drag durante o scroll normal.
3. Pressione e segure um card por 200ms — **deve** iniciar o drag corretamente.
4. Tente mover cards usando Tab + Space + Arrows — deve funcionar via `KeyboardSensor`.

---

### FIX-21 · Adicionar `aria-label` em Todos os Botões de Ícone

**Arquivos:** `src/components/crm/KanbanColumn.tsx`, `src/pages/CRMPage.tsx`, `src/components/layout/AppSidebar.tsx` e outros  
**Tempo estimado:** 2 horas

#### Padrão a seguir

```typescript
// ANTES — inacessível para leitores de tela
<Button variant="ghost" size="icon" onClick={() => onDeleteColumn(column.id)}>
  <Trash2 className="h-4 w-4" />
</Button>

// DEPOIS — acessível
<Button
  variant="ghost"
  size="icon"
  onClick={() => onDeleteColumn(column.id)}
  aria-label={`Deletar coluna ${column.name}`}
>
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

> **Regra geral:** todo `<Button size="icon">` ou elemento clicável que contenha **apenas um ícone SVG** deve ter `aria-label` descritivo. O ícone deve ter `aria-hidden="true"` para não ser lido em duplicata pelo leitor de tela.

#### Lista de botões prioritários para corrigir

| Arquivo | Botão | `aria-label` sugerido |
|---|---|---|
| `KanbanColumn.tsx` | Deletar coluna | `"Deletar coluna {nome}"` |
| `KanbanColumn.tsx` | Editar coluna | `"Editar nome da coluna {nome}"` |
| `KanbanColumn.tsx` | Adicionar lead | `"Adicionar lead em {nome}"` |
| `CRMPage.tsx` | Filtros | `"Abrir filtros"` |
| `CRMPage.tsx` | Exportar | `"Exportar leads"` |
| `AppSidebar.tsx` | Recolher sidebar | `"Recolher menu lateral"` |
| `ApiSettingsModal.tsx` | Copiar token | `"Copiar chave de API"` |
| `WebhookSettingsModal.tsx` | Mostrar/ocultar secret | `"Mostrar webhook secret"` |

---

### FIX-22 · Corrigir Hierarquia Semântica HTML no Layout

**Arquivo:** `src/components/layout/AppLayout.tsx`  
**Tempo estimado:** 45 minutos

#### Problema

```typescript
// ANTES — div soup sem landmarks
<div className="flex h-screen overflow-hidden bg-background">
  <div> {/* sidebar */} </div>
  <div className="flex-1 flex flex-col overflow-hidden">
    <div> {/* header */} </div>
    <div className="flex-1 overflow-auto"> {/* conteúdo */} </div>
  </div>
</div>
```

#### Correção

```typescript
// DEPOIS — landmarks HTML5 para leitores de tela
<div className="flex h-screen overflow-hidden bg-background">
  <nav
    aria-label="Menu principal"
    className={/* mesmas classes CSS */}
  >
    <AppSidebar />
  </nav>

  <div className="flex-1 flex flex-col overflow-hidden">
    <header className={/* mesmas classes CSS */}>
      {/* Header content */}
    </header>

    <main
      id="main-content"
      className="flex-1 overflow-auto"
      tabIndex={-1}          // Permite foco programático para skip links
    >
      {children}
    </main>
  </div>
</div>
```

#### Adicionar "skip link" para navegação por teclado

```typescript
// No início do AppLayout, antes de qualquer outro elemento:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
             focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground
             focus:rounded-md focus:text-sm focus:font-medium"
>
  Ir para o conteúdo principal
</a>
```

> O skip link é invisível para usuários comuns mas aparece quando o usuário navega pelo Tab — permite pular a sidebar e ir direto ao conteúdo, crucial para usuários que não usam mouse.

---

### FIX-23 · Implementar Virtualização no Kanban para Grandes Volumes

**Arquivo:** `src/components/crm/KanbanColumn.tsx`  
**Tempo estimado:** 3 horas

#### Instalar dependência

```bash
npm install @tanstack/react-virtual
```

#### Correção

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

// Dentro do KanbanColumn:
const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: leads.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // altura estimada de cada card em pixels
  overscan: 3,             // renderiza 3 itens além da viewport para scroll suave
});

// Na renderização, substituir o map direto:
<div
  ref={parentRef}
  className="overflow-y-auto flex-1"
  style={{ height: "100%" }}
>
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
    {virtualizer.getVirtualItems().map((virtualItem) => (
      <div
        key={virtualItem.key}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <KanbanCard lead={leads[virtualItem.index]} ... />
      </div>
    ))}
  </div>
</div>
```

> **Nota:** A virtualização muda a posição dos cards para `absolute`, o que pode exigir ajustes no `@dnd-kit` para recalcular coordenadas. Testar drag-and-drop após implementar e ajustar o `DragOverlay` se necessário.

---

## Checklist de Conclusão

Use esta lista para rastrear o progresso das correções:

### Prioridade 1 — Segurança Crítica

- [ ] **FIX-01** — Corrigido bypass de verificação webhook Meta
- [ ] **FIX-02** — `Math.random()` substituído por `crypto.getRandomValues()` em tokens de API
- [ ] **FIX-02** — `Math.random()` substituído por `crypto.getRandomValues()` em webhook secrets
- [ ] **FIX-03** — `btoa(token)` substituído por hash SHA-256
- [ ] **FIX-03** — Chaves antigas revogadas e usuários notificados
- [ ] **FIX-04** — DOMPurify instalado e aplicado no GmailTab
- [ ] **FIX-05** — Bug de reconexão WhatsApp corrigido

### Prioridade 2 — Bugs de Lógica e Integridade

- [ ] **FIX-06** — Migração SQL criada para `notes_local` e `custom_fields`
- [ ] **FIX-06** — LeadProfilePage atualizado para usar Supabase
- [ ] **FIX-06** — Script de migração de dados do localStorage executado
- [ ] **FIX-07** — Fallback `"c1"` removido do AppContext
- [ ] **FIX-07** — `client_id` obtido exclusivamente do perfil autenticado
- [ ] **FIX-08** — Função `auth.is_user_blocked()` criada no banco
- [ ] **FIX-08** — Políticas RLS restritivas aplicadas para usuários bloqueados
- [ ] **FIX-09** — Limite de profundidade adicionado ao `processPart`
- [ ] **FIX-10** — Tratamento de embedding vazio no `ai-chat`

### Prioridade 3 — Qualidade e Manutenção

- [ ] **FIX-11** — Sentry instalado e configurado
- [ ] **FIX-11** — `logger.ts` criado e aplicado nos 17 arquivos com `console.*`
- [ ] **FIX-11** — Regra ESLint `no-console` ativada
- [ ] **FIX-12** — Tipos gerados via `supabase gen types`
- [ ] **FIX-12** — Todos os 26 `(supabase.from as any)` removidos
- [ ] **FIX-13** — Validação de URL de webhook reforçada
- [ ] **FIX-14** — CORS restrito ao domínio da aplicação em todas as Edge Functions
- [ ] **FIX-15** — Testes unitários criados para `generateSecureToken` e `usePermissions`
- [ ] **FIX-16** — Chaves `totum_*` renomeadas para `upixel_*`

### Prioridade 4 — UX/UI e Acessibilidade

- [ ] **FIX-17** — Schema Zod criado para `LeadFormModal`
- [ ] **FIX-17** — `useState` substituído por `useForm` com `zodResolver`
- [ ] **FIX-17** — Erros inline exibidos abaixo de cada campo
- [ ] **FIX-18** — `react-imask` instalado
- [ ] **FIX-18** — Campos de telefone com máscara e `inputMode="tel"`
- [ ] **FIX-18** — Campos de valor com máscara monetária e `inputMode="decimal"`
- [ ] **FIX-19** — Componente `<EmptyState />` criado em `src/components/ui/empty-state.tsx`
- [ ] **FIX-19** — `EmptyState` aplicado no Kanban vazio
- [ ] **FIX-19** — `EmptyState` aplicado na busca sem resultados
- [ ] **FIX-20** — `TouchSensor` adicionado com `delay: 200` e `tolerance: 5`
- [ ] **FIX-20** — `KeyboardSensor` adicionado para drag via teclado
- [ ] **FIX-21** — `aria-label` adicionado em todos os botões de ícone listados
- [ ] **FIX-21** — `aria-hidden="true"` adicionado nos ícones SVG dentro de botões
- [ ] **FIX-22** — `<nav>`, `<header>`, `<main>` substituindo divs no `AppLayout`
- [ ] **FIX-22** — Skip link adicionado para navegação por teclado
- [ ] **FIX-23** — `@tanstack/react-virtual` instalado
- [ ] **FIX-23** — Virtualização aplicada no `KanbanColumn`
- [ ] **FIX-23** — Drag-and-drop testado e funcionando após virtualização

---

## Ordem de Execução Recomendada

```
── SEMANA 1 — Segurança (não pode esperar) ────────────────────────
Dia 1:  FIX-01 → FIX-05 → FIX-02 → FIX-04
Dia 2:  FIX-03 (revogar chaves — comunicar usuários com 24h de antecedência)
Dia 3:  FIX-07 → FIX-08 → FIX-09 → FIX-10
Dia 4:  FIX-06 (maior escopo — migração de dados do localStorage)

── SEMANA 2 — Qualidade de código ─────────────────────────────────
Dia 5:  FIX-11 (Sentry + logger)
Dia 6:  FIX-12 (tipagem Supabase)
Dia 7:  FIX-13 → FIX-14 → FIX-16

── SEMANA 3 — UX e Acessibilidade ─────────────────────────────────
Dia 8:  FIX-21 (aria-labels — rápido, alto impacto em a11y)
Dia 9:  FIX-22 (semântica HTML — base para navegação por teclado)
Dia 10: FIX-20 (TouchSensor) → FIX-17 (validação de formulário)
Dia 11: FIX-18 (máscaras) → FIX-19 (empty states)

── SEMANA 4 — Otimização e testes ─────────────────────────────────
Dia 12: FIX-23 (virtualização Kanban — testar bem antes de fechar)
Dia 13: FIX-15 (testes unitários)
```
