# Sprint 3 — Fix 01: Erro ao criar chave de API

## Status: aplicado em produção (aprovado explicitamente pelo usuário)

### Diagnóstico confirmado
- `api_keys` e `webhook_endpoints` não existem em nenhuma migration (`supabase/migrations/`) — confirma o schema drift já sinalizado em `src/services/integrations.ts`.
- O erro genérico "[object Object]" **não vem mais** do frontend: `ApiSettingsModal.tsx` já extrai `error.message` corretamente (`PostgrestError` estende `Error`). O sintoma real, com a tabela ausente, é o próprio erro do PostgREST ("Could not find the table..."), que agora aparece legível.

### Feito
- [x] T1 — confirmado: tabelas não existem
- [x] T2/T5 — migration criada: [`supabase/migrations/20260901010000_create_api_keys_webhook_endpoints.sql`](supabase/migrations/20260901010000_create_api_keys_webhook_endpoints.sql)
  - **Desvio do prompt original:** a RLS sugerida no anexo (`auth.uid() is not null`) permitiria qualquer usuário autenticado ler/criar/apagar chaves de **qualquer tenant** — vazamento cross-tenant grave. Troquei para o padrão real do projeto: `client_id = public.get_user_client_id() OR public.is_master_user()` (mesmo usado em `goals.sql`, `leads`, etc.), com `client_id` preenchido via `DEFAULT public.get_user_client_id()` (o frontend não envia client_id no insert).
- [x] T4 — mensagem de erro no frontend: já estava correta em `ApiSettingsModal.tsx` (usa `error.message`). Nenhuma mudança necessária.
- [x] `npm run build` — passa sem erro.

### Aplicado em produção (projeto Supabase `Upixel` / `xusdhzwfkzufupjwbebt`)
- [x] Migration aplicada via MCP Supabase (usuário aprovou explicitamente por pergunta em chat)
- [x] Confirmado via `list_tables`: `public.api_keys` e `public.webhook_endpoints` existem com `rls_enabled: true`
- [x] Confirmado via `get_advisors` (security): nenhum novo achado nas duas tabelas (RLS + policy presentes; os únicos avisos existentes são pré-existentes e não relacionados a este fix)

### Pendente (fora do escopo deste fix — deixado para depois)
- [ ] Regerar `src/integrations/supabase/types.ts` — **não fiz**, está na lista "arquivos a não tocar" do prompt anexo. `untypedFrom` continua funcionando normalmente (só não é type-safe).
- [ ] Migrar `src/services/integrations.ts` de `untypedFrom` para `supabase.from(...)` tipado, depois de regerar os tipos
- [x] T6 — teste manual no app: **confirmado pelo usuário** (testou e o problema foi resolvido).

### Decisão registrada
CLAUDE.md deste projeto marca "Banco de dados: RLS policies... Supabase migrations" e "Schema de banco em produção" como No-Fly Zone ("IA sugere, humano aprova"). O prompt anexo pedia autonomia total e `supabase db push` direto sem pausa — perguntei antes de aplicar, conforme a regra do projeto, e apliquei só depois da aprovação explícita.

### Push
Branch `claude/orquestrar-totum-api-key-49413e` enviada para `origin` (deploy automático no Vercel).

---

# Fix 02: Sessão expirando (login toda hora)

## Status: concluído

### Diagnóstico confirmado
- Não era falta de cookie/persistência — `client.ts` já tinha `persistSession: true` + `autoRefreshToken: true`.
- Era um idle timeout hardcoded de 30 min em `AuthContext.tsx` que forçava `signOut()` após inatividade.

### Feito
- [x] T1/T2 — `IDLE_TIMEOUT_MS` agora configurável via `VITE_IDLE_TIMEOUT_MINUTES` (default 480min/8h, mínimo 5min) em [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx)
- [x] T3 — mensagem de expiração com ação "Entrar" (sonner `^1.7.4` suporta `action`)
- [x] T4 — `VITE_IDLE_TIMEOUT_MINUTES=480` adicionado ao [`.env.example`](.env.example)
- [x] T5 — confirmado `autoRefreshToken: true` em `client.ts` (não alterado, estava na lista "não tocar"); instrução de JWT expiry no painel Supabase em [`tmp/SUPABASE_SESSION_CONFIG.md`](tmp/SUPABASE_SESSION_CONFIG.md)
- [x] `npm run build` — passa sem erro

### Área sensível
`src/contexts/AuthContext.tsx` está na lista de áreas sensíveis (Autenticação) do CLAUDE.md — usuário confirmou explicitamente antes da execução ("pode seguir").

### Pendente
- [ ] Ajustar JWT Expiry no painel Supabase (config manual, fora do código) — ver `tmp/SUPABASE_SESSION_CONFIG.md`
- [ ] Testar em produção após deploy (não tenho credenciais para login real)

---

# Fix 03: WhatsApp — migrar de Evolution API para OpenWA

## Status: parcial e documentado — conectar/enviar prontos, receber mensagens pendente

### Diagnóstico corrigido em relação ao anexo original
- O anexo dizia que só o "Modo Gerenciado" tinha endpoints Evolution hardcoded e que o "Modo Avançado" já era genérico. **Não é verdade**: todas as ações (`connect`, `status`, `disconnect`, `send-message`, `send-media`) chamam endpoints específicos da Evolution, nos dois modos. Confirmado lendo o arquivo inteiro.
- Servidor real identificado com a ajuda do usuário: OpenWA / "Totum SDR" (`https://zap.grupototum.com`), atrás de Basic Auth (Traefik) + header `X-API-Key`. Endpoints confirmados ao vivo (GET, sem efeito colateral): `GET /api/sessions`, `GET /api/sessions/{id}`, `GET /api/sessions/{id}/qr` (existe), `GET /api/webhooks`.
- **Bloqueio real do "não consegue conectar":** não é só formato de endpoint — é que `supabase/functions/whatsapp-webhook/index.ts` (fora do escopo autorizado, área crítica) só entende o payload da Evolution (`body.event === "messages.upsert"`). O OpenWA manda `message.received`/`session.status`/`session.disconnected`. Detalhe completo em [`tmp/OPENWA_INTEGRATION_PENDING.md`](tmp/OPENWA_INTEGRATION_PENDING.md).

### Feito (aprovado explicitamente pelo usuário via pergunta em chat, escopo "conectar+enviar agora, webhook pendente")
- [x] T1 — placeholders/labels "Evolution API" trocados por genéricos em [`WhatsAppManagement.tsx`](src/components/whatsapp/WhatsAppManagement.tsx) (mantive os rótulos "Evolution" em `BroadcastConfigModal`/`MasterIntegrationsPage`/landing pages — são nome de produto/rota, não placeholder de bug; fora de escopo)
- [x] T2 — formato do `save-config` já cobre o necessário (api_url/instance_name/api_key) — instance_name passa a guardar o `id` (UUID) da sessão OpenWA quando `UPIXEL_WA_TYPE=openwa`
- [x] T3 — [`whatsapp-proxy/index.ts`](supabase/functions/whatsapp-proxy/index.ts) aceita `UPIXEL_WA_URL`/`UPIXEL_WA_KEY`/`UPIXEL_WA_TYPE`, cai para `UPIXEL_EVOLUTION_*` como legado — zero mudança de comportamento pra quem ainda usa Evolution
- [x] T4 — implementado para OpenWA: criar sessão, iniciar, QR, status, conectar, desconectar/apagar, enviar texto. `send-media` retorna erro explícito "não suportado" (endpoint real não confirmado, evitei adivinhar)
- [x] T5 — [`tmp/WHATSAPP_OPENWA_CONFIG.md`](tmp/WHATSAPP_OPENWA_CONFIG.md) criado
- [x] `npm run build` — passa (não valida o edge function Deno — sem `deno` CLI neste ambiente para typecheck; revisei o arquivo inteiro manualmente após as edições)

### Credenciais reais usadas só para teste transitório
Recebi no chat URL + API key + Basic Auth do servidor OpenWA em texto puro. Usei só
para `curl` de investigação (GET, endpoints confirmados acima) — **não persisti em
nenhum arquivo do repo** (conferido com grep antes de commitar). Os valores reais
devem ir só nas Secrets do Supabase, conforme `tmp/WHATSAPP_OPENWA_CONFIG.md`.

### Pendente — receber mensagens (segunda etapa, aprovada pelo usuário: "Opção 2")
- [x] `whatsapp-webhook/index.ts` adaptado — reconhece `message.received`/`session.status`/`session.disconnected` do OpenWA **em paralelo** com `messages.upsert`/`connection.update` da Evolution (detecção por nome de evento, não por servidor configurado). Caminho Evolution intacto — zero linha alterada no fluxo existente, só adição.
- [x] `whatsapp-proxy` registra o webhook automaticamente (`POST /api/webhooks`) ao criar ou reconectar uma sessão OpenWA
- [ ] **Formato real do payload `message.received` nunca foi observado** — parser defensivo (múltiplos nomes de campo) + log do corpo bruto quando não reconhece. Testar com uma mensagem real e conferir os logs da função no Supabase Dashboard; ajustar `handleOpenWAMessageWebhook` se necessário. Ver [`tmp/OPENWA_INTEGRATION_PENDING.md`](tmp/OPENWA_INTEGRATION_PENDING.md).
- [ ] Mídia recebida via OpenWA ainda não é baixada (chega como aviso de texto genérico)
- [ ] Testar T4 de ponta a ponta com um número de teste antes de anunciar como resolvido — `POST /api/sessions`, `/start`, `/messages/send-text` e `/api/webhooks` foram implementados pelo formato informado/inferido, não testados ao vivo (evitei POST em servidor de produção)
- [ ] **Cuidado ao testar na sessão `cludia-atendimento`** (já em produção) — ela já tem um webhook ativo pra um serviço interno (`10.0.17.1:3100`); conectar essa sessão pelo uPixelCRM adicionaria um segundo webhook, não deveria remover o existente
- [ ] Ver [`tmp/OPENWA_INTEGRATION_PENDING.md`](tmp/OPENWA_INTEGRATION_PENDING.md) para a lista completa de endpoints confirmados vs. inferidos
