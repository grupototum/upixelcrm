# Migração para Cloudflare Pages

Frontend uPixel servido via Cloudflare Pages. Backend (Supabase Edge Functions,
Evolution API, N8N, Alexandria, etc.) **permanece na VPS Hostinger**.

## Por que

Resolve dores recorrentes do deploy atual via rsync:
- ❌ CI GitHub Actions falhando há semanas (SSH port + permissões `/var/www/dist/assets/`)
- ❌ Deploys parciais → tela branca em produção
- ❌ Cache do nginx servindo bundle antigo
- ❌ Latência alta fora de SP (VPS única vs CDN global)

Ganhos imediatos:
- ✅ Atomic deploy (tudo ou nada — sem rsync gymnastics)
- ✅ CDN anycast global (~285 PoPs) — usuários BR/EUA/EU mais rápidos
- ✅ Preview deploys por PR — testa antes de mergear
- ✅ Instant rollback (1 clique no dashboard)
- ✅ WAF + Bot Fight Mode grátis
- ✅ Bandwidth ilimitado plano grátis
- ✅ HTTP/3 + 0-RTT habilitados por default

## Stack

- **Framework:** Vite + React + TypeScript (SPA)
- **Build:** `npm run build` → pasta `dist/`
- **Roteamento:** React Router v6 + multi-tenant via subdomínio `*.upixel.app`
- **PWA:** sim (`public/sw.js` + `public/manifest.json`)

## Variáveis de ambiente

Adicionar em Cloudflare Pages → Project → Settings → Environment variables:

| Variável | Valor (produção) | Origem |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xusdhzwfkzufupjwbebt.supabase.co` | Supabase Dashboard |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` (anon key) | Supabase Dashboard |
| `VITE_SUPABASE_PROJECT_ID` | `xusdhzwfkzufupjwbebt` | Constante |
| `VITE_ROOT_DOMAIN` | `upixel.app` | Constante |
| `VITE_META_APP_ID` | `911162198384188` | Meta App Dashboard |
| `VITE_META_WHATSAPP_CONFIG_ID` | (atual em `.env.production`) | Meta App → WhatsApp Embedded Signup |
| `VITE_META_INSTAGRAM_CONFIG_ID` | (atual em `.env.production`) | Meta App → Instagram Embedded Signup |
| `VITE_META_ADS_CONFIG_ID` | (atual em `.env.production`) | Meta App → Meta Ads Embedded Signup |
| `VITE_META_FB_PAGE_CONFIG_ID` | (criar — Facebook Page Embedded Signup) | Meta App |
| `VITE_SIGNUP_PASSWORD` | (senha pública do `/cadastro`) | Constante |

**Importante:** todas as variáveis precisam estar marcadas como `Production` E `Preview` no Pages se você quer que preview branches funcionem.

## Setup inicial (passo a passo)

### 1. Conectar repositório

1. Acessar https://dash.cloudflare.com/ → **Workers & Pages**
2. **Create application → Pages → Connect to Git**
3. Autorizar GitHub e selecionar `grupototum/upixelcrm`
4. Configurações de build:
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (vazio)
   - **Node version:** `20` (variável `NODE_VERSION=20`)
5. Adicionar todas as variáveis da tabela acima (Production + Preview)
6. **Save and Deploy**

### 2. Custom domains (multi-tenant)

Em **Custom domains** adicionar:

| Domínio | Tipo |
|---|---|
| `upixel.app` | Apex |
| `*.upixel.app` | Wildcard (cobre `acme.upixel.app`, `master.upixel.app`, etc.) |
| `www.upixel.app` | Redirect → apex |

Cloudflare Pages aceita wildcard automaticamente. Como o DNS de `upixel.app` já está no Cloudflare, ele propõe os DNS records corretos com 1 clique.

**Importante:** se a VPS ainda está servindo `upixel.app` neste momento, faça preview em um domínio temporário primeiro (`upixel-pages.pages.dev`), valide tudo, depois faça o swap.

### 3. Cutover (sem downtime)

```
0. PREVIEW
   - Aguarda primeiro deploy do Pages terminar
   - Acessa upixel-{hash}.pages.dev → confirma que carrega
   - Testa fluxos críticos no preview:
     · login
     · inbox
     · cmd+K
     · criar lead
     · conectar canal (popup OAuth funciona?)
     · proxy de /functions/v1/* (testar `curl upixel-{hash}.pages.dev/functions/v1/whatsapp-cloud-webhook?hub.mode=subscribe`)

1. CUTOVER
   - DNS no Cloudflare: deletar A/CNAME apontando pra 187.127.4.140
   - Adicionar custom domain `upixel.app` no Pages → CF cria CNAME automático
   - Aguarda propagação (5-30 min — geralmente segundos pq DNS é Cloudflare)

2. VALIDAÇÃO
   - curl https://upixel.app/ → deve servir do Pages (header `cf-ray` muda)
   - Webhooks Meta continuam respondendo via /functions/v1/* proxy
   - Service worker carrega corretamente
   - Acessar acme.upixel.app — multi-tenant funciona

3. ROLLBACK (se necessário)
   - Cloudflare DNS → restaurar A record original `upixel.app → 187.127.4.140`
   - VPS continua servindo até deletarmos
```

### 4. Deprecação do deploy antigo (depois do cutover validado)

**Não fazer agora.** Após 1-2 semanas estável no Pages:
1. Desabilitar workflow `.github/workflows/deploy.yml` (renomear pra `.disabled` ou deletar)
2. Parar o container `upixel-api` na VPS
3. Manter `/var/www/upixelcrm/dist` como backup por 30 dias antes de remover
4. Continuar usando nginx da VPS pra outras coisas (Alexandria, N8N, Evolution)

## Estrutura de arquivos novos

```
public/
├── _headers      ← security headers + cache control
├── _redirects    ← SPA fallback + proxy /functions/v1/* + redirects legais
└── ...           ← (resto inalterado)
```

Cloudflare Pages lê `_headers` e `_redirects` automaticamente da pasta `dist/` (Vite copia `public/*` pra `dist/` no build).

## Edge cases tratados

### Webhooks Meta App Review
A URL `upixel.app/functions/v1/data-deletion-callback` foi submetida na revisão do app Meta. O `_redirects` faz proxy transparente pra Supabase, mantendo a URL pública estável.

### PWA Service Worker
`sw.js` é servido com `Cache-Control: no-cache` e `Service-Worker-Allowed: /` — propaga updates sem cache stale.

### Páginas legais (HTML estático)
`/privacy-policy/*` e `/data-deletion-status/*` são servidas como HTML estático (não passam pelo SPA fallback). Necessário porque Meta crawler não roda JS.

### Multi-tenant via subdomínio
Cada tenant acessa via `acme.upixel.app`. O wildcard custom domain cobre todos. React Router lê `window.location.hostname` no `TenantContext` (sem mudanças necessárias).

## CI/CD pós-migração

O Cloudflare Pages **substitui** o GitHub Actions de deploy:
- `git push origin main` → Pages builda + deploya automaticamente (~1-2min)
- Cada PR vira um preview deploy independente
- `git push origin <branch>` → preview em `<branch>.upixelcrm.pages.dev`

**Tests/lint ainda no GitHub Actions** (não migrar isso — Pages não roda tests).

## Custos

| Item | Plano Free | Pro ($20/mês) |
|---|---|---|
| Builds | 500/mês | 5000/mês |
| Bandwidth | Ilimitado | Ilimitado |
| Sites | Ilimitados | Ilimitados |
| Preview deploys | ✅ | ✅ |
| Concurrent builds | 1 | 5 |
| Build cache | ✅ | ✅ |

uPixel cabe no Free folgadamente.

## FAQ

**Posso usar o mesmo repo pra Pages + GitHub Actions?**
Sim. O Pages observa `main` (e outras branches que você marcar). GitHub Actions roda em paralelo pra tests/lint.

**A VPS continua sendo necessária?**
Sim — backend está lá: Evolution API, N8N, Alexandria, Postgres, Redis, totum-chat. Cloudflare Pages só substitui o servidor estático do frontend uPixel.

**E se eu precisar de SSR no futuro?**
Migrar pra Next.js + Vercel. Mas SPA + Supabase atende 99% dos casos uPixel.

**Como faço deploy local pra testar?**
```bash
npx wrangler pages dev dist
# Ou via Pages CLI:
npx wrangler@latest pages deploy dist --project-name=upixelcrm
```

## Próximos passos depois da migração

- Habilitar **Web Analytics** (grátis, sem cookies) — `Pages → Analytics`
- Configurar **Page Rules** para CSP/WAF customizado se necessário
- Avaliar **Cloudflare Access** pra proteger preview deploys com SSO
- Habilitar **Image Optimization** se tiver imagens pesadas
