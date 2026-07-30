# Magic Link — Configuração no Supabase

O código do Magic Link (LoginPage + `/auth/callback`) já está no app. Para ativar em produção, configure o painel do Supabase (projeto `xusdhzwfkzufupjwbebt`):

## 1. Authentication → Providers → Email

- **Enable Email provider**: ON (já usado pelo login com senha).
- **Confirm email**: manter como está hoje. O sistema usa aprovação manual
  (`profiles.approval_status`) no lugar da confirmação de e-mail
  (ver `20260428_user_approval_system.sql`), então "Confirm email" deve
  permanecer **desativado** — o Magic Link já valida a posse do e-mail por si só.
- **Secure email change** e demais opções: sem alteração.

## 2. Authentication → URL Configuration

- **Site URL**: `https://upixel.com.br` (ou o domínio raiz em uso).
- **Redirect URLs** — adicionar (wildcards são suportados):
  - `https://*.upixel.com.br/auth/callback`
  - `http://localhost:8080/auth/callback` (dev)
  - `http://*.localhost:8080/auth/callback` (dev com subdomínio)

Sem essas entradas o Supabase ignora o `emailRedirectTo` enviado pelo app e
redireciona para a Site URL, quebrando o fluxo do callback.

## 3. Rate limits (Authentication → Rate Limits)

O padrão de e-mails/hora do SMTP embutido do Supabase é baixo (3-4/h).
Para uso real, configurar SMTP próprio em **Project Settings → Auth → SMTP**.

## 4. Migration

Aplicar `supabase/migrations/20260730120000_fix_owner_access_and_magic_link_profiles.sql`
(SQL Editor ou `supabase db push`). Ela contém:

- Correção do `handle_new_user` (vincula `tenant_id` do metadata do signup).
- Triggers de claim de tenant/organization (aprovam e vinculam o dono).
- Backfill de perfis presos (`tenant_id` NULL/zero-uuid, donos em `pending`).
- RPC `ensure_own_profile()` usada pelo callback no primeiro acesso.

## 5. Comportamento do fluxo

1. Usuário digita o e-mail na aba "Magic Link" do `/login` do subdomínio.
2. Recebe o link → abre `/auth/callback` no mesmo subdomínio.
3. Callback valida a sessão e aplica a MESMA régua do login com senha
   (aprovação + pertencimento ao tenant/organization do subdomínio).
4. Sucesso → `/dashboard`. Link expirado/inválido → `/login?error=expired`.
   Conta pendente/rejeitada ou workspace errado → `/login?error=<motivo>`.
5. Se o usuário autenticado ainda não tiver registro em `profiles`, o callback
   chama `ensure_own_profile()` que cria o perfil com `role='atendente'`
   (menor privilégio — o sistema não tem role `viewer`) e `approval_status='pending'`.
