-- Migration: garante isolamento multi-tenant das instâncias WhatsApp.
--
-- IMPORTANTE: revise antes de aplicar. Esta migration pode FALHAR se já existirem
-- duplicatas no banco — nesse caso, é preciso limpar/renomear duplicatas primeiro.
--
-- Roda esses checks ANTES:
--
--   SELECT client_id, config->>'instance_name' AS instance_name, count(*)
--   FROM integrations
--   WHERE provider IN ('whatsapp', 'whatsapp_official')
--     AND config->>'instance_name' IS NOT NULL
--   GROUP BY 1, 2
--   HAVING count(*) > 1;
--
--   SELECT (config->>'api_url') AS api_url, (config->>'instance_name') AS instance_name, count(*) AS dups, array_agg(client_id) AS clients
--   FROM integrations
--   WHERE provider = 'whatsapp'
--     AND config->>'instance_name' IS NOT NULL
--     AND config->>'api_url' IS NOT NULL
--   GROUP BY 1, 2
--   HAVING count(*) > 1;

BEGIN;

-- 1) Unique por (client_id, instance_name) — impede um tenant criar duas instâncias
--    com o mesmo nome no banco mesmo que o cliente bypass a UI.
CREATE UNIQUE INDEX IF NOT EXISTS integrations_unique_instance_per_client
  ON integrations (client_id, (config->>'instance_name'))
  WHERE provider IN ('whatsapp', 'whatsapp_official')
    AND config->>'instance_name' IS NOT NULL;

-- 2) Unique por (api_url, instance_name) — impede dois tenants apontarem para
--    a MESMA instância no MESMO servidor Evolution (raiz da colisão cross-tenant).
--    Tenants em advanced mode com servidores diferentes ainda podem usar o
--    mesmo nome amigável — o api_url diferente desempata.
CREATE UNIQUE INDEX IF NOT EXISTS integrations_unique_instance_per_server
  ON integrations ((config->>'api_url'), (config->>'instance_name'))
  WHERE provider = 'whatsapp'
    AND config->>'instance_name' IS NOT NULL
    AND config->>'api_url' IS NOT NULL;

COMMIT;
