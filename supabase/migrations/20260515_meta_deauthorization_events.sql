-- Registro de eventos de "deauthorize" do Meta (usuário removeu o app).
-- Diferente de data-deletion: aqui o usuário só revogou a autorização do app —
-- os dados continuam, mas tokens/sessões devem ser invalidados.
-- Workers posteriores leem essa tabela para revogar tokens armazenados.

BEGIN;

CREATE TABLE IF NOT EXISTS public.meta_deauthorization_events (
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

CREATE INDEX IF NOT EXISTS idx_mde_meta_user ON public.meta_deauthorization_events (meta_user_id);
CREATE INDEX IF NOT EXISTS idx_mde_status ON public.meta_deauthorization_events (status) WHERE status IN ('pending', 'processing');

ALTER TABLE public.meta_deauthorization_events ENABLE ROW LEVEL SECURITY;

-- Sem policies: apenas service_role (Edge Functions) acessa.

COMMIT;
