# tenant-provision-domain

Adiciona automaticamente o subdomínio de um tenant recém-criado como custom
domain no projeto Vercel, deixando o onboarding 100% automatizado.

## Secrets necessários (Supabase → Settings → Secrets)

| Secret | Onde pegar |
|---|---|
| `VERCEL_API_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_PROJECT_ID` | Vercel → Project upixelcrm → Settings → General → Project ID |
| `VERCEL_TEAM_ID` | Vercel → Team Settings → General → Team ID (opcional para projetos pessoais) |

## Env opcional

| Var | Default |
|---|---|
| `ROOT_DOMAIN` | `upixel.app` |

## Como chamar

Fire-and-forget no fim do fluxo de signup:

```ts
supabase.functions.invoke("tenant-provision-domain", {
  body: { subdomain: "acme" },
}).catch(() => undefined);
```

## Comportamento

- Idempotente: se o domínio já existir no projeto (409 Vercel), retorna sucesso.
- Falha não bloqueia signup: chamador usa fire-and-forget.
- SSL automático provisionado pela Vercel (~10s após adicionar).
- DNS pré-requisito: registro CNAME `*.upixel.app → cname.vercel-dns.com`
  no provedor de DNS (Cloudflare), modo "Somente DNS".

## Backfill de tenants existentes

Para adicionar domínios de tenants já cadastrados, rode uma query no SQL Editor
do Supabase e invoque a função para cada subdomain:

```sql
SELECT subdomain FROM organizations WHERE subdomain IS NOT NULL;
```

E pra cada um, pode chamar via `curl`:

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/tenant-provision-domain" \
  -H "Authorization: Bearer <SUPABASE_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"acme"}'
```
