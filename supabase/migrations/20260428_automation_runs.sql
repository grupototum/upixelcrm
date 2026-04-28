-- ============================================================================
-- Automation Runs (modelo Salesbot do Kommo)
-- ============================================================================
-- Cada vez que um lead "entra" numa automação complexa, criamos um RUN.
-- O run tem um current_node_id (onde o lead está parado) e um status:
--   • running  → executando passos sequenciais
--   • waiting  → pausado em um nó wait_for_reply (aguardando mensagem do lead)
--   • completed→ chegou ao final do fluxo
--   • failed   → erro irrecuperável
--   • paused   → pausado manualmente pelo operador
--
-- Quando o lead manda uma nova mensagem, o webhook procura por runs com
-- status='waiting' para esse lead e retoma a execução a partir do
-- próximo nó conectado ao current_node_id.
--
-- Esse modelo permite:
--   • Conversas multi-turn (bot envia → espera → recebe → envia próxima)
--   • Re-enrollment (mesmo lead pode entrar várias vezes em automações
--     diferentes ou na mesma com a flag allow_re_enroll)
--   • Estatísticas confiáveis (runs em curso, finalizados, taxa de sucesso)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT        NOT NULL,
  tenant_id       UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id   UUID        NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  lead_id         UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_node_id TEXT,                                          -- nó atual (waiting) ou último executado
  status          TEXT        NOT NULL DEFAULT 'running',
                  -- 'running' | 'waiting' | 'completed' | 'failed' | 'paused'
  context         JSONB       NOT NULL DEFAULT '{}'::jsonb,      -- variáveis acumuladas (ex: respostas anteriores)
  trigger_event   TEXT,                                          -- 'new_lead' | 'status_change' | 'message_received' ...
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  error           TEXT,
  steps_executed  INTEGER     NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON public.automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_lead        ON public.automation_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_client      ON public.automation_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status      ON public.automation_runs(status);
-- Índice crítico para resumir run em mensagem recebida
CREATE INDEX IF NOT EXISTS idx_automation_runs_waiting
  ON public.automation_runs(lead_id, status)
  WHERE status = 'waiting';

CREATE OR REPLACE FUNCTION public.update_automation_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_automation_runs_updated_at ON public.automation_runs;
CREATE TRIGGER trg_automation_runs_updated_at
  BEFORE UPDATE ON public.automation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_automation_runs_updated_at();

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on automation_runs" ON public.automation_runs;
CREATE POLICY "Tenant isolation on automation_runs"
  ON public.automation_runs FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR public.is_master_user()
  );

-- ─── automation_runs metadata na tabela automations ─────────────────────────
-- Adiciona configurações que o builder/UI usa
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automations' AND column_name='allow_re_enroll') THEN
    ALTER TABLE public.automations ADD COLUMN allow_re_enroll BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automations' AND column_name='description') THEN
    ALTER TABLE public.automations ADD COLUMN description TEXT;
  END IF;
END $$;

-- ─── View resumida para a listagem na UI (ComplexTab) ───────────────────────
CREATE OR REPLACE VIEW public.automation_runs_summary AS
SELECT
  a.id          AS automation_id,
  a.client_id,
  COUNT(*) FILTER (WHERE r.status = 'running')   AS running_count,
  COUNT(*) FILTER (WHERE r.status = 'waiting')   AS waiting_count,
  COUNT(*) FILTER (WHERE r.status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE r.status = 'failed')    AS failed_count,
  COUNT(*) FILTER (WHERE r.status = 'paused')    AS paused_count,
  COUNT(*)                                       AS total_runs,
  MAX(r.started_at)                              AS last_run_at
FROM public.automations a
LEFT JOIN public.automation_runs r ON r.automation_id = a.id
GROUP BY a.id, a.client_id;
