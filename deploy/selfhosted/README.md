# uPixel CRM — Stack Supabase self-hosted (VPS)

Scaffold da **Fase 1** de `../../docs/MIGRACAO_SELFHOSTED_PLAN.md` (plano de
migração Supabase Cloud → self-hosted). Preparado pelo **[AGENTE]**; subir
isto contra uma VPS real é trabalho do **[OPERADOR]** — nada aqui foi
executado contra infraestrutura real.

## O que tem aqui

```
deploy/selfhosted/
├── docker-compose.yml       # Postgres + GoTrue + PostgREST + Realtime +
│                             # Storage + postgres-meta + Studio +
│                             # edge-runtime + Kong
├── .env.example              # todas as variáveis, sem valores reais
├── volumes/
│   ├── db/
│   │   ├── postgresql.conf   # habilita pg_cron + pg_net (shared_preload_libraries)
│   │   └── init/
│   │       ├── 00-extensions.sql   # CREATE EXTENSION pg_cron, pg_net, etc.
│   │       └── README.md           # ⚠️ leia antes da Fase 1 — falta os
│   │                                #    scripts oficiais de roles/schemas
│   └── api/
│       └── kong.yml          # gateway: roteia /auth, /rest, /realtime,
│                               # /storage, /functions, /pg (meta)
├── proxy/
│   ├── Caddyfile.example      # reverse proxy com TLS automático
│   └── nginx.conf.example     # alternativa nginx + certbot
└── scripts/
    ├── generate-jwt-keys.md   # como gerar JWT_SECRET/ANON_KEY/SERVICE_ROLE_KEY
    ├── dump.sh                # rascunho: dump do projeto cloud (Fase 3)
    └── restore.sh             # rascunho: restore na VPS (Fase 3)
```

**Não inclui** a stack de observabilidade (Logflare/Vector/Analytics) do
Supabase self-hosted oficial — fora do escopo pedido para esta fase. Sem
ela, o Studio funciona para Table Editor / SQL Editor / Auth / Storage; só
a aba de Logs fica indisponível. Pode ser adicionada depois seguindo o
`docker-compose.yml` oficial em <https://github.com/supabase/supabase/tree/master/docker>.

## Passo a passo — **[OPERADOR]**

1. **Roles/schemas do Postgres**: leia `volumes/db/init/README.md` — falta
   copiar os scripts SQL oficiais de roles/schemas do repo do Supabase
   antes do primeiro start (de propósito não foram reescritos à mão aqui,
   ver justificativa no arquivo).
2. **Gerar segredos**: siga `scripts/generate-jwt-keys.md` para
   `JWT_SECRET`/`ANON_KEY`/`SERVICE_ROLE_KEY`, e `openssl rand -base64 24`
   para `POSTGRES_PASSWORD`/`DASHBOARD_PASSWORD`.
3. **Preencher `.env`**: `cp .env.example .env` e completar todos os
   campos (inclui os 21 secrets de edge functions inventariados na Fase 0
   — exportar os valores atuais do painel Supabase cloud, Edge Functions
   → Secrets; eles **não** estão neste repo).
4. **DNS + TLS**: apontar `api.upixel.com.br` (ou o domínio escolhido) para
   o IP da VPS, e configurar o proxy — `proxy/Caddyfile.example` (mais
   simples, TLS automático) ou `proxy/nginx.conf.example` + certbot.
5. **SMTP real**: preencher as variáveis `SMTP_*` no `.env` — sem isso,
   Magic Link e recuperação de senha não funcionam (ver
   `../../docs/MAGIC_LINK_SETUP.md`).
6. **Subir a stack**:
   ```bash
   cd deploy/selfhosted
   docker compose up -d
   docker compose ps   # todos os serviços "healthy"/"running"
   ```
7. **Validar** (isso já é o critério de aceite da Fase 1 do plano —
   normalmente o [AGENTE] confere isso por HTTPS numa sessão seguinte, já
   que hoje o acesso à VPS a partir do ambiente do agente está bloqueado
   pela mesma restrição de rede que bloqueia o cloud — ver Fase 0):
   ```bash
   curl https://api.upixel.com.br/auth/v1/health
   curl https://api.upixel.com.br/rest/v1/ -H "apikey: $ANON_KEY"
   ```

## Secrets de edge functions — mapa completo

Ver `.env.example` (seção "Secrets de Edge Functions") para a lista com
comentário de qual função usa qual secret. Fonte: inventário da Fase 0 do
plano (`../../docs/MIGRACAO_SELFHOSTED_PLAN.md`), extraído via
`Deno.env.get(...)` em cada `supabase/functions/*/index.ts`.

## Scripts de dump/restore (Fase 3)

`scripts/dump.sh` e `scripts/restore.sh` são **rascunhos não executados**
— preparam os comandos exatos que o [OPERADOR] roda manualmente na Fase 3
do plano (ensaio de dados, ainda sem cutover). Revisar linha a linha antes
de rodar contra o projeto cloud de verdade.
