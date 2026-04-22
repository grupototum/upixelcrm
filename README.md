# uPixel CRM

CRM SaaS multi-tenant baseado em subdomínios, construído com React + Vite + Supabase.

## Arquitetura Multi-Tenant

Cada cliente acessa o sistema pelo seu próprio subdomínio (ex: `acme.upixel.com.br`).  
O isolamento de dados é garantido via RLS no Supabase usando `tenant_id`.

### Fluxo de onboarding
1. Cliente acessa o domínio raiz (`upixel.com.br`)
2. Preenche nome, subdomínio desejado, e-mail e senha
3. Sistema cria o tenant e o usuário automaticamente
4. Cliente é redirecionado para `{subdomain}.upixel.com.br`

---

## Desenvolvimento Local

### Pré-requisitos
- Node.js 18+ ou Bun
- Conta no Supabase com as migrations aplicadas

### Instalação
```bash
npm install   # ou: bun install
```

### Variáveis de ambiente
Copie `.env` e ajuste as variáveis:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon
VITE_ROOT_DOMAIN=localhost   # domínio raiz em dev
```

### Testando subdomínios localmente

**1. Edite o `/etc/hosts`** (Linux/Mac) ou `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
127.0.0.1  localhost
127.0.0.1  acme.localhost
127.0.0.1  demo.localhost
127.0.0.1  minha-empresa.localhost
```
Adicione uma linha para cada subdomínio que quiser testar.

**2. Inicie o servidor:**
```bash
npm run dev   # ou: bun dev
```
O Vite já está configurado com `host: "::"` — aceita todas as interfaces.

**3. Acesse no navegador:**

| URL | Resultado |
|-----|-----------|
| `http://localhost:8080` | Landing Page (criação de conta) |
| `http://acme.localhost:8080` | App do tenant "acme" |
| `http://invalido.localhost:8080` | Página "Empresa não encontrada" |

> **Dica:** Crie um tenant pelo formulário da Landing Page em `localhost:8080` — o campo subdomínio aceita `acme` e o sistema cria tudo automaticamente.

---

## Aplicando as Migrations no Supabase

No painel do Supabase → SQL Editor, execute os arquivos em ordem:

```
supabase/migrations/20260324225441_*.sql
supabase/migrations/20260326_auth_rbac.sql
supabase/migrations/20260327_integrations.sql
...
supabase/migrations/20260422_multi_tenant.sql   ← multi-tenant
```

Ou via CLI:
```bash
supabase db push
```

---

## Scripts disponíveis

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm run preview   # preview do build
npm run test      # testes unitários
npm run lint      # lint
```
