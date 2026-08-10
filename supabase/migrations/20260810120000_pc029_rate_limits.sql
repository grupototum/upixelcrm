-- PC-029: rate limiting na camada de API.
-- Antes disso, as edge functions dependiam 100% do default da plataforma —
-- qualquer um podia martelar os webhooks públicos (verify_jwt = false) sem teto.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key   TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits         INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);

-- Nenhuma policy: só o service role das edge functions escreve aqui.
-- RLS ligada e sem policy = negado para authenticated/anon por padrão.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits (window_start);

-- Incremento atômico: o UPSERT resolve a corrida entre invocações concorrentes
-- da mesma função (ler-depois-escrever contaria a menos sob carga).
CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_key             TEXT,
  p_window_seconds  INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window TIMESTAMPTZ;
  v_hits   INTEGER;
BEGIN
  -- Janela fixa: trunca o instante atual para o início do bloco de N segundos.
  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits (bucket_key, window_start, hits)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO v_hits;

  RETURN v_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- Limpeza: linhas de janelas velhas não servem para nada.
CREATE OR REPLACE FUNCTION public.prune_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
$$;

REVOKE ALL ON FUNCTION public.prune_rate_limits() FROM PUBLIC, anon, authenticated;
