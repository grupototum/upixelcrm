# TENANT_PLAN.md — Arquitetura Multi-Tenant por Subdomínio

## 1. Estado Atual do Repositório

### Banco de dados
- Tabela `organizations` existe com colunas `id, name, slug, owner_id, created_at, updated_at`
- Todas as tabelas principais possuem `client_id TEXT` (não UUID) para isolamento de dados
- `profiles` possui `client_id TEXT` e `organization_id UUID` (FK para `organizations`)
- RLS funciona via função `get_user_client_id()` que lê `profiles.client_id`
- Função `is_master_user()` para acesso administrativo global
- `handle_new_user` trigger define `client_id = user.id` no signup

### Problema central
O `client_id` é um TEXT arbitrário. Não há tabela `tenants` com `subdomain`. O `organization_id` existe em `profiles` mas as políticas RLS ignoram esse campo. Não há lógica de subdomínio no frontend.

### Tabelas principais identificadas
`leads`, `tasks`, `pipelines`, `pipeline_columns`, `conversations`, `messages`,
`integrations`, `automations`, `automation_rules`, `timeline_events`, `push_subscriptions`, `profiles`

---

## 2. Estratégia Adotada

**Não remover `client_id`** — existe em produção e as políticas atuais dependem dele.  
**Criar `tenants`** como entidade central (separada de `organizations`) e adicionar `tenant_id UUID` nas tabelas.  
**Fazer `client_id = tenant_id::text`** no momento do signup, mantendo retrocompatibilidade com `get_user_client_id()`.  
**RLS**: as políticas atuais já funcionam corretamente — apenas garantimos que `tenant_id` e `client_id` são consistentes.

---

## 3. Banco de Dados — SQL da Migração

### Arquivo: `supabase/migrations/20260422_multi_tenant.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- ETAPA 1: Tabela tenants
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  subdomain   TEXT        NOT NULL UNIQUE
                          CHECK (subdomain ~ '^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$'),
  plan        TEXT        NOT NULL DEFAULT 'free',
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler tenants pelo subdomain (necessário no boot do app)
CREATE POLICY "Public can read tenants by subdomain"
  ON public.tenants FOR SELECT
  USING (true);

-- Apenas o owner pode atualizar/deletar seu tenant
CREATE POLICY "Owner can update tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete tenant"
  ON public.tenants FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ════════════════════════════════════════════════════════════
-- ETAPA 2: Adicionar tenant_id nas tabelas principais
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.profiles        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.leads           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tasks           ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.pipelines       ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_columns ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.conversations   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.messages        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.integrations    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.automations     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;


-- ════════════════════════════════════════════════════════════
-- ETAPA 3: Função auxiliar get_user_tenant_id()
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;


-- ════════════════════════════════════════════════════════════
-- ETAPA 4: Atualizar handle_new_user para aceitar tenant_id
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- tenant_id pode vir via raw_user_meta_data (passado no signUp options.data)
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;

  INSERT INTO public.profiles (id, name, email, role, client_id, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor'),
    -- client_id = tenant_id::text para manter retrocompatibilidade com RLS existente
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', NEW.id::text),
    v_tenant_id
  );
  RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- ETAPA 5: Políticas RLS adicionais usando tenant_id
-- (as políticas via client_id continuam funcionando;
--  estas são uma segunda camada usando o UUID diretamente)
-- ════════════════════════════════════════════════════════════

-- Leads
CREATE POLICY "Tenant isolation on leads (tenant_id)"
  ON public.leads FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Tasks
CREATE POLICY "Tenant isolation on tasks (tenant_id)"
  ON public.tasks FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Pipelines
CREATE POLICY "Tenant isolation on pipelines (tenant_id)"
  ON public.pipelines FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Pipeline Columns
CREATE POLICY "Tenant isolation on pipeline_columns (tenant_id)"
  ON public.pipeline_columns FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Conversations
CREATE POLICY "Tenant isolation on conversations (tenant_id)"
  ON public.conversations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Messages
CREATE POLICY "Tenant isolation on messages (tenant_id)"
  ON public.messages FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Integrations
CREATE POLICY "Tenant isolation on integrations (tenant_id)"
  ON public.integrations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Automations
CREATE POLICY "Tenant isolation on automations (tenant_id)"
  ON public.automations FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Automation Rules
CREATE POLICY "Tenant isolation on automation_rules (tenant_id)"
  ON public.automation_rules FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Timeline Events
CREATE POLICY "Tenant isolation on timeline_events (tenant_id)"
  ON public.timeline_events FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Push Subscriptions
CREATE POLICY "Tenant isolation on push_subscriptions (tenant_id)"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_master_user())
  WITH CHECK (tenant_id = public.get_user_tenant_id());
```

---

## 4. Frontend — Arquivos a Criar

### `src/utils/tenant.ts` (NOVO)
Extrai o subdomínio do `window.location.hostname`.

```
Lógica:
- hostname = "acme.upixel.com.br"  → subdomain = "acme"
- hostname = "acme.localhost"       → subdomain = "acme"  (dev)
- hostname = "upixel.com.br"        → subdomain = null    (domínio raiz)
- hostname = "www.upixel.com.br"    → subdomain = null    (www = raiz)
- hostname = "localhost"            → subdomain = null
```

### `src/contexts/TenantContext.tsx` (NOVO)
React Context que:
1. Chama `getTenantSubdomain()` na inicialização
2. Se subdomain != null → consulta `tenants` pelo `subdomain`
3. Expõe: `{ tenant, subdomain, isLoading, notFound }`
4. Se `notFound = true` → App renderiza `<TenantNotFoundPage />`
5. Se `subdomain = null` → App renderiza `<LandingPage />`

### `src/pages/LandingPage.tsx` (NOVO)
Página exibida no domínio raiz. Conteúdo:
- Apresentação do produto
- Botão "Criar sua conta" com formulário de signup que inclui campo `subdomínio`
- O signup chama uma função `createTenantAndUser(name, subdomain, email, password)` que:
  1. Verifica se subdomain já existe em `tenants`
  2. Cria row em `tenants`
  3. Chama `supabase.auth.signUp` passando `tenant_id` nos `options.data`
  4. Redireciona para `https://{subdomain}.upixel.com.br`

### `src/pages/TenantNotFoundPage.tsx` (NOVO)
Página 404 para subdomínios inexistentes. Exibe:
- "Empresa não encontrada"
- Link para o domínio raiz

---

## 5. Frontend — Arquivos a Modificar

### `src/App.tsx`
Envolver tudo em `<TenantProvider>` antes do `<AuthProvider>`.

Adicionar lógica de roteamento condicional no topo:
```
if isLoading → spinner
if notFound  → <TenantNotFoundPage />
if !subdomain (domínio raiz) → <LandingPage /> (sem AuthProvider)
se subdomain válido → estrutura atual de rotas
```

### `src/contexts/AuthContext.tsx`
**signup()**: remover. A criação de conta passa a ser feita exclusivamente via `LandingPage` + `createTenantAndUser()`.

**login()**: após `signInWithPassword`, verificar se `profile.tenant_id` bate com o `tenant.id` do subdomínio atual. Se não bater → `supabase.auth.signOut()` e retornar erro `"Usuário não pertence a esta empresa"`.

### `src/contexts/AppContext.tsx`
Substituir a leitura de `client_id` de `user_metadata` (fallback `"c1"`) por `tenant.id` lido do `TenantContext`. Isso garante que todas as queries usem o ID correto sem depender de metadata do JWT.

### `src/integrations/supabase/types.ts`
Adicionar tipo `tenants` na seção `Tables`:
```typescript
tenants: {
  Row: {
    id: string; name: string; subdomain: string; plan: string;
    owner_id: string | null; is_active: boolean;
    created_at: string; updated_at: string;
  }
  Insert: { name: string; subdomain: string; owner_id?: string | null; plan?: string; }
  Update: { name?: string; subdomain?: string; plan?: string; is_active?: boolean; }
  Relationships: []
}
```

---

## 6. Fluxo de Roteamento Completo

```
window.location.hostname
        │
        ▼
  getTenantSubdomain()
        │
   ┌────┴────┐
null/www    subdomain
   │            │
   ▼            ▼
LandingPage  consulta tenants WHERE subdomain = X
                │
          ┌─────┴─────┐
        found       not found
          │              │
     AuthProvider   TenantNotFoundPage
     + App routes   (404 - Empresa não encontrada)
```

---

## 7. Fluxo de Criação de Conta (Signup)

```
1. Usuário preenche: nome, e-mail, senha, subdomínio
2. Frontend valida formato do subdomínio (regex: ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$)
3. Consulta SELECT FROM tenants WHERE subdomain = X
   → Se existe: erro "Subdomínio já está em uso"
4. INSERT INTO tenants (name, subdomain, owner_id=null) → obtém tenant.id
5. supabase.auth.signUp({ email, password, options: { data: { name, tenant_id: tenant.id, role: 'supervisor' } } })
6. Trigger handle_new_user cria profile com tenant_id e client_id = tenant_id::text
7. UPDATE tenants SET owner_id = user.id WHERE id = tenant.id
8. Redireciona para https://{subdomain}.upixel.com.br/login
```

---

## 8. Fluxo de Login

```
1. Usuário em acme.upixel.com.br/login
2. TenantContext já carregou tenant { id: X, subdomain: "acme" }
3. supabase.auth.signInWithPassword({ email, password })
4. Busca profile WHERE id = user.id
5. Verifica: profile.tenant_id === tenant.id
   → Se falso: signOut() + erro "Usuário não pertence a esta empresa"
   → Se verdadeiro: autenticado com sucesso
```

---

## 9. Ambiente de Desenvolvimento Local

Adicionar ao `README.md`:

```markdown
## Testando subdomínios localmente

### 1. Editar /etc/hosts
Adicione linhas para cada tenant que quiser testar:
```
127.0.0.1  localhost
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
```

### 2. Iniciar o servidor de desenvolvimento
O Vite já está configurado com `host: "::"` (aceita todas as interfaces).
Apenas rode normalmente:
```
npm run dev   # ou bun dev
```

### 3. Acessar
- Domínio raiz: http://localhost:8080 → LandingPage
- Tenant "acme": http://acme.localhost:8080 → App do tenant
- Subdomínio inválido: http://xpto.localhost:8080 → TenantNotFoundPage
```

---

## 10. Arquivos — Resumo Completo

| Ação     | Arquivo                                          | Motivo                                    |
|----------|--------------------------------------------------|-------------------------------------------|
| CRIAR    | `supabase/migrations/20260422_multi_tenant.sql`  | tabela tenants, tenant_id, RLS, triggers  |
| CRIAR    | `src/utils/tenant.ts`                            | extração de subdomínio                    |
| CRIAR    | `src/contexts/TenantContext.tsx`                 | contexto global do tenant                 |
| CRIAR    | `src/pages/LandingPage.tsx`                      | página raiz + signup                      |
| CRIAR    | `src/pages/TenantNotFoundPage.tsx`               | 404 de subdomínio inválido                |
| MODIFICAR | `src/App.tsx`                                   | roteamento condicional por subdomínio     |
| MODIFICAR | `src/contexts/AuthContext.tsx`                  | validação de tenant no login              |
| MODIFICAR | `src/contexts/AppContext.tsx`                   | substituir client_id fallback por tenant  |
| MODIFICAR | `src/integrations/supabase/types.ts`            | tipo da tabela tenants                    |
| MODIFICAR | `README.md`                                     | guia de desenvolvimento local             |

---

## 11. Riscos e Decisões Relevantes

| Decisão | Justificativa |
|---------|---------------|
| Manter `client_id` | Está em produção; as políticas RLS existentes continuam funcionando. O `tenant_id` é adicionado como segunda camada. |
| `tenants` separado de `organizations` | `organizations` tem semântica diferente (multi-org por usuário); `tenants` é o isolador principal do SaaS. |
| `SELECT true` em `tenants` | O app precisa resolver o tenant por subdomínio **antes** de ter um usuário autenticado. |
| Signup apenas na LandingPage | Evita que alguém crie conta dentro de um subdomínio de outro tenant. |
| Signup atômico (tenant + user) | Se o `signUp` falhar após criar o tenant, fazemos `DELETE FROM tenants` para evitar subdomínios "fantasmas". |

---

**Aguardando sua aprovação para iniciar a implementação.**
