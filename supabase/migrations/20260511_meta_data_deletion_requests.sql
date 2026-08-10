-- Registro de solicitações de exclusão de dados Meta (LGPD + Meta protocol).
-- Cada vez que a Meta nos chama via data-deletion-callback, criamos uma linha.
-- Workers / admin processam a remoção real depois (até 24h conforme Privacy Policy).

BEGIN;

CREATE TABLE IF NOT EXISTS public.meta_data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_user_id TEXT NOT NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mddr_meta_user ON public.meta_data_deletion_requests (meta_user_id);
CREATE INDEX IF NOT EXISTS idx_mddr_status ON public.meta_data_deletion_requests (status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_mddr_code ON public.meta_data_deletion_requests (confirmation_code);

-- RLS: ninguém lê isso direto pela API. Só service_role (Edge Functions) escreve/lê.
ALTER TABLE public.meta_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Sem policies = sem acesso para anon/authenticated. Apenas service_role passa pelo RLS.

COMMIT;
