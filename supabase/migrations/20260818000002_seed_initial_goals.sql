-- Seed das 4 metas operacionais iniciais do time de vendas.
-- Idempotente: não insere se já existir meta com mesmo título.
-- client_id='c1' confirmado em 20260423_create_totum_tenant.sql.
DO $$
DECLARE
  v_client_id text := 'c1';
BEGIN

  INSERT INTO goals (title, metric, target_value, period, client_id, created_at, updated_at)
  SELECT t.title, t.metric, t.target_value, t.period, v_client_id, now(), now()
  FROM (VALUES
    ('Tentativas de ligação',        'call_attempts', 300, 'daily'),
    ('Contatos ativos (cadência)',    'calls_made',    200, 'weekly'),
    ('Reuniões realizadas',          'meetings_done',  14, 'weekly'),
    ('Vendas fechadas',              'leads_closed',    4, 'weekly')
  ) AS t(title, metric, target_value, period)
  WHERE NOT EXISTS (
    SELECT 1 FROM goals g
    WHERE g.title = t.title
      AND g.client_id = v_client_id
  );

END$$;
