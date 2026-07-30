# Plano de Migração — Supabase Cloud → Self-hosted (VPS)

**Status geral:** `FASE 0 — em andamento (inventário local parcial feito; falta dump do cloud + acesso ao painel). Artefatos [AGENTE] da FASE 1 preparados adiantado (regra 7) — scaffold deploy/selfhosted/ pronto, mas execução contra VPS real segue bloqueada até a Fase 0 fechar.`
**Executor:** agente (Claude Sonnet 5) em sessões incrementais + operador humano (ações na VPS/painéis)
**Origem:** projeto cloud `xusdhzwfkzufupjwbebt` (`https://xusdhzwfkzufupjwbebt.supabase.co`)
**Destino:** stack Supabase self-hosted em VPS própria (Docker Compose)

---

## Como usar este plano (leia antes de tudo, agente)

1. **Uma fase por sessão** (ou menos). Nunca pule fase. Nunca avance sem os critérios de aceite da fase anterior verificados.
2. Ao concluir qualquer passo, **atualize a seção "Diário de execução"** no fim deste arquivo (data, fase, o que foi feito, pendências) e commite. Este arquivo é a fonte de verdade do progresso.
3. Ações marcadas **[OPERADOR]** são executadas pelo humano (SSH na VPS, painéis Supabase/Vercel/DNS). O agente prepara os comandos/arquivos exatos e valida o resultado por HTTPS depois.
4. Ações marcadas **[AGENTE]** o agente executa direto (arquivos no repo, validações via rede, SQL via MCP se autorizado).
5. **No-Fly Zones do CLAUDE.md valem aqui**: banco de produção, auth e deleção de dados → agente sugere, humano aprova antes de executar contra produção.
6. Produção continua no **cloud** até a Fase 6 (cutover). Nada antes disso pode afetar o ambiente atual.
7. **Preparação de artefatos [AGENTE] de fase futura é permitida a qualquer momento; EXECUÇÃO contra infra real exige o aceite da fase anterior.** Ou seja: escrever/commitar arquivos (docker-compose, scripts, migrations novas, docs) para uma fase à frente pode acontecer mesmo com a fase atual ainda aberta — desde que nada disso rode contra o cloud ou a VPS de verdade antes da hora.

### Pré-requisitos da sessão do agente

- Ambiente de nuvem com **acesso à rede liberado** (o nível "Confiável" bloqueia `*.supabase.co`, o domínio da VPS e o site em produção — sem isso o agente só prepara arquivos, não valida nada).
- MCP do Supabase autorizado (opcional, ajuda nas fases 0–3 contra o cloud).
- **Nunca** colocar service role key / senha de Postgres nas variáveis de ambiente do ambiente de nuvem (campo é visível). Secrets ficam só na VPS e nos painéis.

---

## FASE 0 — Inventário e verificação de drift

Objetivo: saber exatamente o que existe no cloud antes de replicar.

- [ ] **[OPERADOR]** Gerar dump de schema do cloud: `pg_dump "$CLOUD_DB_URL" --schema-only --no-owner --no-privileges -f schema-cloud.sql` (connection string em Project Settings → Database). Compartilhar o arquivo com o agente (sem dados, sem senhas).
- [ ] **[AGENTE]** Comparar `schema-cloud.sql` com as migrations de `supabase/migrations/` e listar o **drift** (objetos criados só pelo SQL Editor: tabelas, policies, funções, triggers, cron jobs). Nota conhecida: já houve drift antes (ver `20260729120000_restore_user_admin_rpcs.sql`). **Bloqueado** até o dump chegar — ver nota de rede abaixo.
- [ ] **[AGENTE]** Gerar migration de reconciliação `9999_reconcile_drift.sql` com o que faltar no repo. Já se sabe de pelo menos **um item de drift** (ver Cron jobs abaixo) — falta confirmar o restante contra o dump completo.
- [x] **[AGENTE]** Inventariar e documentar aqui (parte que dá para fazer só com o repo, sem acesso ao cloud — ver nota de rede):
  - [x] **Edge functions ativas e secrets.** 33 functions em `supabase/functions/` (fora `_shared`). Secrets usados por função (nomes extraídos via `Deno.env.get(...)`, sem valores):

    | Function | Secrets |
    |---|---|
    | admin-create-user | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | ai-chat | GROQ_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | asaas-payment | ASAAS_API_KEY, ASAAS_API_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | asaas-webhook | ASAAS_WEBHOOK_TOKEN, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | automation-engine | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | automation-worker | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | check-signup-gate | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | data-deletion-callback | META_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | database-backup | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | facebook-messenger-webhook | FACEBOOK_APP_SECRET, META_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | facebook-page-embedded-signup | META_APP_ID, META_APP_SECRET, META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | google-ads | GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | google-oauth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | instagram-exchange-token | META_APP_ID, META_APP_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | instagram-proxy | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | instagram-webhook | FACEBOOK_APP_SECRET, META_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | meta-ads | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | meta-ads-exchange-token | META_APP_ID, META_APP_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | meta-leads-webhook | FACEBOOK_APP_SECRET, META_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | notify-signup | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | rag-embed | GROQ_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | rag-search | GROQ_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | send-push | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT |
    | tenant-provision-domain | ROOT_DOMAIN, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, VERCEL_API_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID |
    | whatsapp-cloud-exchange-token | META_APP_ID, META_APP_SECRET, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-cloud-proxy | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-cloud-webhook | FACEBOOK_APP_SECRET, META_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-health-check | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-proxy | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, UPIXEL_EVOLUTION_KEY, UPIXEL_EVOLUTION_URL |
    | whatsapp-queue-processor | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-status-probe | SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-templates | SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |
    | whatsapp-webhook | SDR_PILOT_TENANT_ID, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL |

    Secrets únicos a provisionar na VPS além dos 3 padrão do Supabase (`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, que na VPS serão os novos valores gerados na Fase 1, não os do cloud): `ASAAS_API_KEY`, `ASAAS_API_URL`, `ASAAS_WEBHOOK_TOKEN`, `FACEBOOK_APP_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GROQ_API_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID`, `ROOT_DOMAIN`, `SDR_PILOT_TENANT_ID`, `UPIXEL_EVOLUTION_KEY`, `UPIXEL_EVOLUTION_URL`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`. Valores atuais só existem no painel do Supabase (Edge Functions → Secrets) — **[OPERADOR]** precisa exportá-los de lá (não estão no repo nem no agente).
  - [ ] Webhooks externos apontando para o cloud (Evolution API, Meta/Instagram/Facebook, Asaas) — URLs exatas. **Pendente [OPERADOR]**: confirmar nos painéis externos (Evolution API, Meta App Dashboard, Asaas) quais URLs de `*.supabase.co/functions/v1/...` estão cadastradas hoje — o agente não tem acesso a esses painéis.
  - [x] **Cron jobs (`pg_cron`).** Só um job é criado via migration no repo: `automation-worker` (a cada minuto, `* * * * *`), definido em `20260428_automation_worker_cron.sql` e corrigido em `20260618_automation_worker_cron_fix.sql`. **Drift confirmado por evidência indireta:** a própria migration de fix de 20260618 documenta que existe em produção um segundo cron, `whatsapp-queue-processor` (referenciado como "cron de referência já funcional", usado para copiar a autenticação do `automation-worker`), mas **não há nenhuma migration no repo que crie esse job** — ele foi criado direto no SQL Editor/painel. A function `whatsapp-queue-processor` existe em `supabase/functions/`, então o job deve invocá-la, mas o schedule exato e o comando (`net.http_post` com qual URL/headers) são desconhecidos até alguém rodar a query abaixo no cloud. **[OPERADOR]** rodar isto no SQL Editor do projeto cloud e colar o resultado aqui (é leitura, sem risco):
    ```sql
    select jobid, jobname, schedule, command, active from cron.job order by jobname;
    ```
  - [ ] Buckets do Storage e volume aproximado. Migrations no repo criam só **um** bucket: `whatsapp_media` (`public=true`, ver `20260331184150_e9cc935c-cb34-4d63-b32e-a54b3eb07c6b.sql`, limites ajustados em `20260610120400_storage_whatsapp_media_limits.sql`). Não dá para confirmar se há outros buckets criados fora de migration (drift) nem o volume de dados sem acesso ao painel/API do cloud — **[OPERADOR/rede]**.
  - [ ] Config de Auth no painel: providers, redirect URLs, SMTP, rate limits. **Pendente [OPERADOR]** — só existe no painel Supabase, agente não tem acesso.
  - [ ] Contagem de linhas das tabelas principais (`profiles`, `tenants`, `organizations`, `leads`, `conversations`, `messages`, ...) para conferência pós-restore. **Pendente** — requer query contra o Postgres do cloud (bloqueado nesta sessão, ver nota de rede).

> **Nota de rede (confirmado nesta sessão, 2026-07-30):** `curl https://xusdhzwfkzufupjwbebt.supabase.co/...` retorna `403` no proxy do ambiente ("Confiável" bloqueia `*.supabase.co`, como o plano já previa). O MCP do Supabase também não está autorizado nesta sessão (precisa de OAuth interativo, indisponível em sessão não-interativa). Resultado: todo item de Fase 0 que depende de acessar o projeto cloud (dump de schema, drift completo, contagem de linhas, config de Auth, buckets reais) **continua bloqueado** até (a) o operador rodar os comandos/queries marcados **[OPERADOR]** acima e colar os resultados aqui, ou (b) uma sessão futura rodar com rede liberada + MCP do Supabase autorizado.

**Aceite:** inventário completo escrito neste doc + drift reconciliado em migration commitada. **Ainda não atingido** — falta a metade do inventário que depende do cloud (ver nota de rede acima) e a migration `9999_reconcile_drift.sql`.

## FASE 1 — Stack base na VPS

Objetivo: Supabase self-hosted rodando vazio e saudável.

- [x] **[AGENTE]** Preparar no repo (`deploy/selfhosted/`): `docker-compose.yml` oficial do Supabase (Postgres 15+, GoTrue, PostgREST, Realtime, Storage, Kong, edge-runtime, Studio, com `pg_cron`/`pg_net` habilitados via `postgresql.conf`), `.env.example` com todos os parâmetros nomeados (incluindo os 21 secrets de edge functions da Fase 0), instruções de geração de segredos (`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` — `scripts/generate-jwt-keys.md`), exemplo de reverse proxy com TLS (`proxy/Caddyfile.example` e `proxy/nginx.conf.example`) e README com o passo a passo do `[OPERADOR]`. Validado nesta sessão com `docker compose config` (renderiza sem erro, 9 serviços, nenhuma variável não resolvida) — ver Diário. **Falta**: `volumes/db/init/` só tem as extensions; os scripts oficiais de roles/schemas do Postgres (`CREATE ROLE`/`GRANT` de `supabase_admin`, `authenticator`, `auth`/`storage` schemas etc.) precisam ser copiados do repo oficial do Supabase pelo `[OPERADOR]` antes do primeiro `docker compose up` real — ver `volumes/db/init/README.md` para o porquê e o comando exato.
- [ ] **[OPERADOR]** Subir na VPS; DNS `api.upixel.com.br` (ou similar) → VPS; TLS (Caddy/Traefik/nginx + certbot); SMTP real configurado no GoTrue (o Magic Link depende disso).
- [ ] **[AGENTE]** Validar por HTTPS: `GET /auth/v1/health`, `GET /rest/v1/` (com anon key), Studio acessível, Realtime conectando. **Bloqueado** até existir uma VPS de verdade rodando a stack (rede do ambiente do agente também bloqueia o domínio da VPS, mesma restrição da Fase 0).

**Aceite:** healthchecks verdes por HTTPS a partir da sessão do agente. **Ainda não atingido** — o scaffold está pronto e validado localmente (config estático), mas nada foi executado contra uma VPS real nesta sessão (proibido sem o aceite da Fase 0, e sem acesso à VPS mesmo que fosse permitido).

## FASE 2 — Schema

Objetivo: schema idêntico ao cloud, criado a partir do repo.

- [ ] **[AGENTE]** Aplicar as migrations em ordem contra a VPS (`supabase db push --db-url ...` ou psql em loop). Corrigir falhas de ordem/dependência se aparecerem (commitando fixes).
- [ ] **[AGENTE]** Aplicar `9999_reconcile_drift.sql`.
- [ ] **[AGENTE]** Diff final: `pg_dump --schema-only` da VPS vs `schema-cloud.sql` → diferenças zero (ou justificadas por escrito aqui).

**Aceite:** diff de schema limpo.

## FASE 3 — Dados (ensaio, sem cutover)

Objetivo: restore completo validado — ainda como ensaio, o cloud segue sendo produção.

- [ ] **[OPERADOR]** `pg_dump` de dados do cloud (schemas `public`, `auth`, `storage`) e restore na VPS (comandos exatos preparados pelo agente). Janela de baixo uso; é um snapshot, não precisa de freeze.
- [ ] **[OPERADOR]** Copiar arquivos do Storage (script do agente usando as duas APIs de storage ou `rclone`).
- [ ] **[AGENTE]** Validar: contagens de linhas vs inventário da Fase 0; login de um usuário de teste direto no GoTrue da VPS (`POST /auth/v1/token?grant_type=password`) — **hashes de senha migram e funcionam**; RLS ativa (query anônima em `leads` retorna vazio); um arquivo de storage baixável.

**Aceite:** checklist de validação 100%, registrado aqui.

## FASE 4 — Edge functions, secrets e cron

- [ ] **[AGENTE]** Adaptar o deploy das functions para self-hosted (edge-runtime no compose serve `supabase/functions/`); documentar mapa de secrets.
- [ ] **[OPERADOR]** Definir os valores dos secrets na VPS (incl. `SERVICE_ROLE_KEY` novo — o do cloud não vale na VPS).
- [ ] **[AGENTE]** Smoke test de cada function crítica na VPS: `check-signup-gate`, `admin-create-user`, `whatsapp-webhook` (payload sintético), `notify-signup`.
- [ ] **[AGENTE]** Recriar jobs do `pg_cron` (automation worker) e validar execução.

**Aceite:** todas as functions críticas respondendo 2xx na VPS com comportamento igual ao cloud.

## FASE 5 — Ensaio geral (staging)

- [ ] **[AGENTE]** Deploy de preview do frontend (Vercel preview env) com `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` apontando para a VPS.
- [ ] **[AGENTE + OPERADOR]** Roteiro E2E no preview: login senha, Magic Link (e-mail chega? callback funciona? redirect URLs da VPS configuradas), signup de tenant novo, inbox/realtime, CRM drag&drop, upload de arquivo.
- [ ] **[AGENTE]** Registrar aqui qualquer divergência e corrigir antes de seguir.

**Aceite:** roteiro E2E completo sem falha no preview apontando para a VPS.

## FASE 6 — Cutover (janela agendada, aprovação explícita do operador)

- [ ] **[OPERADOR]** Congelar escrita (pausar webhooks Evolution/Meta/Asaas; avisar usuários).
- [ ] **[OPERADOR]** Dump final + restore (dados mudados desde a Fase 3 — mais rápido: re-dump completo, o volume permite).
- [ ] **[OPERADOR]** Trocar no Vercel (produção): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` → redeploy.
- [ ] **[OPERADOR]** Reapontar webhooks externos (Evolution, Meta, Asaas) para as URLs de functions da VPS.
- [ ] **[AGENTE]** Verificação pós-cutover imediata: login, Magic Link, recebimento de mensagem WhatsApp de teste, criação de lead.
- [ ] **[OPERADOR]** Cloud fica intocado como rollback: se algo crítico falhar, reverter env vars do Vercel + webhooks (rollback em minutos, perda limitada à janela).

**Aceite:** produção operando na VPS; incidentes zero por 24h.

## FASE 7 — Pós-cutover

- [ ] Monitorar 7 dias (logs GoTrue/PostgREST/functions; backup automático diário do Postgres da VPS configurado e testado — **restore testado**, não só o dump).
- [ ] Colocar o projeto cloud em pause (Supabase permite) após 7–14 dias; cancelar depois de 30.
- [ ] Atualizar `CLAUDE.md`, `docs/MAGIC_LINK_SETUP.md` e `.env.example` com as URLs novas.

---

## Riscos principais

| Risco | Mitigação |
|---|---|
| Drift de schema não mapeado quebra o restore | Fase 0 obrigatória; diff zero na Fase 2 |
| E-mails (Magic Link/recuperação) sem SMTP confiável | SMTP dedicado na Fase 1; teste real na Fase 5 |
| Webhooks externos apontando pro lugar errado após cutover | Inventário de URLs na Fase 0 + checklist da Fase 6 |
| Backup inexistente na VPS (no cloud era automático) | Fase 7: backup diário + teste de restore antes de desligar o cloud |
| Perda de mensagens WhatsApp durante a janela | Congelar webhooks; Evolution reenvia? verificar na Fase 0; janela curta e fora de horário |

## Diário de execução

| Data | Fase | O que foi feito | Pendências |
|---|---|---|---|
| 2026-07-30 | — | Plano criado (sessão Fable). Nada executado ainda. | Fase 0 aguardando: liberar rede do ambiente + dump de schema do cloud |
| 2026-07-30 | 0 | Sessão Sonnet 5: confirmado que rede continua bloqueada (`*.supabase.co` → 403) e MCP Supabase não autorizado. Feito o inventário local (sem depender do cloud): tabela completa de secrets por edge function (33 functions), cron jobs do repo + **1 item de drift encontrado** (`whatsapp-queue-processor` roda em produção mas não existe em nenhuma migration — query pronta para o operador confirmar `schedule`/`command`), bucket de Storage único no repo (`whatsapp_media`). Documentado tudo na seção Fase 0 acima. | Falta: dump `schema-cloud.sql` do operador, drift completo, `9999_reconcile_drift.sql`, webhooks externos (painéis), config de Auth (painel), contagem de linhas (precisa do cloud) |
| 2026-07-30 | 0 + 1 (adiantado) | Sessão Sonnet 5 (orquestrar-totum, execução direta [AGENTE]): (1) adicionada regra 7 na seção "Como usar este plano" — preparar artefatos de fase futura é permitido a qualquer momento, execução contra infra real continua exigindo aceite da fase anterior. (2) Scaffold completo da Fase 1 em `deploy/selfhosted/`: `docker-compose.yml` (db/auth/rest/realtime/storage/meta/studio/functions/kong, pg_cron+pg_net habilitados), `.env.example` com os 21 secrets de edge function da Fase 0, `volumes/db/postgresql.conf` + `init/00-extensions.sql`, `volumes/api/kong.yml`, `proxy/Caddyfile.example` + `nginx.conf.example`, `scripts/generate-jwt-keys.md`, README. (3) Rascunhos `scripts/dump.sh`/`restore.sh` (Fase 3, não executados) e `supabase/migrations/9999_reconcile_drift.sql` (novo arquivo; só emite `RAISE NOTICE` sobre o drift do `whatsapp-queue-processor` — não recria o cron com schedule/command adivinhados). **Validado**: `docker compose config` com `.env` fake local renderiza sem erro (9 serviços, nenhuma var não resolvida — arquivo temporário deletado, nunca commitado); `bash -n` limpo nos 2 scripts; `kong.yml` é YAML válido; `npm run build` e `npm test` (47/47) continuam passando após `npm install` (nenhum arquivo em `src/` ou migrations existentes tocado). **Não validado**: `docker compose up` real (só `config`, por instrução explícita — não subir serviços mesmo localmente) e o SQL do `9999_reconcile_drift.sql` não foi executado contra nenhum Postgres (mantido simples de propósito). Nenhuma etapa passou de 2 tentativas de retry nem ficou >15min. | Falta [OPERADOR]: copiar os scripts oficiais de roles/schemas do Postgres para `volumes/db/init/` (ver README lá — não reproduzidos de memória, risco de erro sutil), gerar os secrets reais e só então rodar a Fase 1 de verdade numa VPS; tudo o que dependia do cloud na Fase 0 continua igual (ver linha acima) |
