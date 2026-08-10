-- PC-038 (passos d/e) — RLS por tenant no bucket whatsapp_media + bucket privado.
--
-- RASCUNHO PARA REVISÃO — NÃO APLICADO. Não rodar contra produção sem
-- confirmar que o passo B (backfill de mídia legada) já rodou.
--
-- Estado herdado:
--   20260331184150 (criação do bucket): public = true, INSERT/SELECT
--     abertas pra qualquer authenticated, sem checar dono do arquivo.
--   20260610120000 (security_hardening_cleanup): tirou a leitura pública
--     da POLICY, mas o bucket seguiu public = true — a URL pública
--     (/storage/v1/object/public/whatsapp_media/...) ignora RLS e serve
--     qualquer objeto pra qualquer um independente de policy.
--   3dce29e (PC-038 passo A, este branch): uploads passaram a gravar em
--     `{client_id}/{arquivo}` em vez da raiz — pré-requisito pra dar pra
--     escrever a policy abaixo (`(storage.foldername(name))[1]` é NULL
--     pra objeto na raiz).
--
-- Efeito líquido antes desta migration: qualquer usuário autenticado de
-- QUALQUER tenant lê/escreve o objeto de QUALQUER outro tenant, e a URL
-- pública funciona pra qualquer um mesmo sem estar logado.

-- ── 1. Tenant scoping nas policies de storage.objects ──────────────────────
-- Casa o primeiro segmento do path com o tenant do usuário logado, usando
-- get_user_client_id() — mesma função (cacheada, SECURITY DEFINER) já usada
-- nas policies de leads/conversations/messages. (select ...) por fora
-- segue o padrão de 20260610120300_perf_rls_initplan_select_wrap.sql
-- (essa varredura só cobre schema `public`, não `storage` — por isso
-- aplicado manualmente aqui).

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read whatsapp media" ON storage.objects;

CREATE POLICY "Users can upload media in their client"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp_media'
    AND (storage.foldername(name))[1] = (select public.get_user_client_id())
  );

CREATE POLICY "Users can read media in their client"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp_media'
    AND (storage.foldername(name))[1] = (select public.get_user_client_id())
  );

-- Sem policy de UPDATE/DELETE de propósito: nenhum fluxo do frontend altera
-- ou apaga objeto de storage diretamente — fica negado por padrão pra
-- authenticated. Os webhooks de inbound escrevem via adminClient (service
-- role), que ignora RLS — não dependem destas policies pra continuar
-- funcionando.

-- ── 2. Fecha o bucket ────────────────────────────────────────────────────
-- Enquanto public = true, a URL pública ignora as policies acima por
-- completo — elas só valem pra list/download via API/SDK. Sem este flip,
-- o passo 1 é decorativo: o objeto continua acessível por qualquer um via
-- a URL direta.
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp_media';

-- ── Risco conhecido, herdado do passo B (backfill) ──────────────────────
-- Objetos "órfãos" (sem mensagem associada — reportados pelo backfill como
-- `skipped`) continuam na raiz do bucket sem client_id. A partir desta
-- migration eles ficam inacessíveis: a policy acima não casa objeto sem
-- pasta, e a URL pública para de funcionar. Checar
-- migration-dump/backfill-whatsapp-media-*.json (campo `skipped`) antes de
-- aplicar — se houver órfão referenciado em alguma UI fora do que o
-- backfill enxergou, ele quebra em silêncio.
