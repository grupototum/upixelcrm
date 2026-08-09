# Migração Supabase (Lovable → Projeto próprio)

Guia passo-a-passo para migrar do projeto Supabase gerenciado pelo Lovable para um projeto próprio na sua conta do Supabase.

---

## Pré-requisitos

- Acesso ao painel do Supabase (ambos projetos)
- Service Role Key de ambos os projetos (Settings → API → `service_role` secret)
- Node.js 18+ instalado localmente

---

## Passo 1 — Criar o projeto novo

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → escolha nome, região e senha do banco
3. Aguarde o provisionamento (~2 min)

---

## Passo 2 — Aplicar o schema

No painel do projeto NOVO → **SQL Editor**, execute as migrations em ordem cronológica:

```
supabase/migrations/20260324225441_*.sql
supabase/migrations/20260326_auth_rbac.sql
supabase/migrations/20260327_integrations.sql
supabase/migrations/20260327210805_*.sql
supabase/migrations/20260330151739_*.sql
supabase/migrations/20260330151928_*.sql
supabase/migrations/20260330152001_*.sql
supabase/migrations/20260330152034_*.sql
supabase/migrations/20260330152108_*.sql
supabase/migrations/20260330154226_*.sql
supabase/migrations/20260330154721_*.sql
supabase/migrations/20260330154742_*.sql
supabase/migrations/20260330154903_*.sql
supabase/migrations/20260330173000_automation_rules.sql
supabase/migrations/20260330175705_*.sql
supabase/migrations/20260331130111_*.sql
supabase/migrations/20260331141011_*.sql
supabase/migrations/20260331170000_chatwoot_features.sql
supabase/migrations/20260331184150_*.sql
supabase/migrations/20260401_add_lead_category.sql
supabase/migrations/20260401_add_typebot_to_templates.sql
supabase/migrations/20260401_recharge_system.sql
supabase/migrations/20260401_whatsapp_templates.sql
supabase/migrations/20260404165526_*.sql
supabase/migrations/20260406144316_*.sql
supabase/migrations/20260406145102_*.sql
supabase/migrations/20260407145601_*.sql
supabase/migrations/20260422_multi_tenant.sql
```

Dica: rode uma por vez e verifique se não há erros antes de continuar.

---

## Passo 3 — Exportar dados do projeto antigo

No terminal, na raiz do projeto:

```bash
export OLD_SUPABASE_URL="https://lliciixbnielenwsyeop.supabase.co"
export OLD_SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-do-projeto-antigo"

node scripts/export-supabase.mjs
```

O export cria a pasta `migration-dump/` com um JSON por tabela + `auth-users.json`.

---

## Passo 4 — Importar no projeto novo

```bash
export NEW_SUPABASE_URL="https://seu-novo-projeto.supabase.co"
export NEW_SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-do-projeto-novo"

node scripts/import-supabase.mjs
```

O import:
- Recria usuários com os mesmos UUIDs (FKs ficam intactas)
- Faz UPSERT das tabelas em ordem de dependência
- Atribui **senha temporária aleatória** a cada usuário

---

## Passo 5 — Atualizar o `.env`

Troque as credenciais do frontend para apontar para o projeto NOVO:

```env
VITE_SUPABASE_URL="https://seu-novo-projeto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key-do-projeto-novo"
VITE_SUPABASE_PROJECT_ID="seu-novo-projeto-id"
```

Reinicie o `npm run dev`.

---

## Passo 6 — Notificar usuários

Como as senhas foram substituídas por valores aleatórios, cada usuário precisa
redefinir a senha via o fluxo "Esqueci minha senha" no login.

Você pode disparar em massa via SQL Editor no projeto novo:

```sql
-- Envia e-mail de reset para todos os usuários
SELECT auth.send_password_recovery(email)
FROM auth.users;
```

> Se `auth.send_password_recovery` não existir na sua versão, use a Admin API
> via outro script ou peça para os usuários clicarem em "Esqueci senha" manualmente.

---

## Passo 7 — Desligar o projeto antigo

Só depois de confirmar que o app novo está 100% funcional:

1. Pause o projeto antigo no Lovable (não delete ainda — backup)
2. Após 30 dias de operação estável, pode deletar

---

## Problemas comuns

**"duplicate key violates unique constraint"**
→ Rode novamente — o script usa UPSERT, é idempotente.

**"foreign key violation"**
→ Alguma migration não foi aplicada. Confira o schema no painel.

**Usuário não consegue logar**
→ Senha foi aleatorizada. Use "Esqueci minha senha".

**RLS bloqueando import**
→ O service_role bypass RLS. Se der erro, confirme que está usando a
   service_role key (não a anon).
