-- Registro de eventos de desautorização Meta (remoção do app pelo usuário).
-- Cada POST verificado em deauthorize-callback insere uma linha aqui.
-- Workers/admin processam a revogação real (invalidar tokens, marcar integrações).

BEGIN;

CREATE TABLE IF NOT EXISTS public.meta_deauthorize_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_user_id TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mde_meta_user ON public.meta_deauthorize_events (meta_user_id);
CREATE INDEX IF NOT EXISTS idx_mde_status ON public.meta_deauthorize_events (status) WHERE status IN ('pending', 'processing');

ALTER TABLE public.meta_deauthorize_events ENABLE ROW LEVEL SECURITY;

COMMIT;
