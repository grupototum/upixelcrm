# Plano de Migração — Supabase Cloud → Self-hosted (VPS)

**Status geral:** `FASE 0 — não iniciada`
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

### Pré-requisitos da sessão do agente

- Ambiente de nuvem com **acesso à rede liberado** (o nível "Confiável" bloqueia `*.supabase.co`, o domínio da VPS e o site em produção — sem isso o agente só prepara arquivos, não valida nada).
- MCP do Supabase autorizado (opcional, ajuda nas fases 0–3 contra o cloud).
- **Nunca** colocar service role key / senha de Postgres nas variáveis de ambiente do ambiente de nuvem (campo é visível). Secrets ficam só na VPS e nos painéis.

---

## FASE 0 — Inventário e verificação de drift

Objetivo: saber exatamente o que existe no cloud antes de replicar.

- [ ] **[OPERADOR]** Gerar dump de schema do cloud: `pg_dump "$CLOUD_DB_URL" --schema-only --no-owner --no-privileges -f schema-cloud.sql` (connection string em Project Settings → Database). Compartilhar o arquivo com o agente (sem dados, sem senhas).
- [ ] **[AGENTE]** Comparar `schema-cloud.sql` com as ~130 migrations de `supabase/migrations/` e listar o **drift** (objetos criados só pelo SQL Editor: tabelas, policies, funções, triggers, cron jobs). Nota conhecida: já houve drift antes (ver `20260729120000_restore_user_admin_rpcs.sql`).
- [ ] **[AGENTE]** Gerar migration de reconciliação `9999_reconcile_drift.sql` com o que faltar no repo.
- [ ] **[AGENTE]** Inventariar e documentar aqui:
  - [ ] Edge functions ativas (repo tem 20+ em `supabase/functions/`) e **todos os secrets** que cada uma usa (nomes, não valores).
  - [ ] Webhooks externos apontando para o cloud (Evolution API, Meta/Instagram/Facebook, Asaas) — URLs exatas.
  - [ ] Cron jobs (`pg_cron` — automation worker, ver `20260428_automation_worker_cron.sql` e fix de 20260618).
  - [ ] Buckets do Storage e volume aproximado.
  - [ ] Config de Auth no painel: providers, redirect URLs, SMTP, rate limits.
  - [ ] Contagem de linhas das tabelas principais (`profiles`, `tenants`, `organizations`, `leads`, `conversations`, `messages`, ...) para conferência pós-restore.

**Aceite:** inventário completo escrito neste doc + drift reconciliado em migration commitada.

## FASE 1 — Stack base na VPS

Objetivo: Supabase self-hosted rodando vazio e saudável.

- [ ] **[AGENTE]** Preparar no repo (`deploy/selfhosted/`): `docker-compose.yml` oficial do Supabase (Postgres 15+, GoTrue, PostgREST, Realtime, Storage, Kong, edge-runtime, Studio), `.env.example` com todos os parâmetros nomeados, instruções de geração de segredos (`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` via ferramenta oficial).
- [ ] **[OPERADOR]** Subir na VPS; DNS `api.upixel.com.br` (ou similar) → VPS; TLS (Caddy/Traefik/nginx + certbot); SMTP real configurado no GoTrue (o Magic Link depende disso).
- [ ] **[AGENTE]** Validar por HTTPS: `GET /auth/v1/health`, `GET /rest/v1/` (com anon key), Studio acessível, Realtime conectando.

**Aceite:** healthchecks verdes por HTTPS a partir da sessão do agente.

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
