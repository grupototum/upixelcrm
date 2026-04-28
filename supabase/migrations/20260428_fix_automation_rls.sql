-- ════════════════════════════════════════════════════════════
-- Fix: RLS WITH CHECK das tabelas automations e automation_rules
--
-- O policy criado em 20260422_multi_tenant.sql tem WITH CHECK
-- estrito (`tenant_id = get_user_tenant_id()`) — o que rejeita
-- inserts onde o usuário não tem tenant_id setado no profile.
-- Isso provoca 400 Bad Request ao criar automações.
--
-- Esta migration relaxa o WITH CHECK para aceitar tenant_id NULL
-- (consistente com a cláusula USING).
-- ════════════════════════════════════════════════════════════

-- ─── automations ───
DROP POLICY IF EXISTS "Tenant isolation on automations" ON public.automations;
CREATE POLICY "Tenant isolation on automations"
  ON public.automations FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  );

-- ─── automation_rules ───
DROP POLICY IF EXISTS "Tenant isolation on automation_rules" ON public.automation_rules;
CREATE POLICY "Tenant isolation on automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = public.get_user_tenant_id() OR
    public.is_master_user()
  );

-- ─── Garante colunas retry/next_retry em automation_queue ───
-- (idempotente — necessário caso 20260424_advanced_features.sql não tenha rodado)
ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS retry_count    INTEGER     NOT NULL DEFAULT 0;

ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_automation_queue_retry
  ON public.automation_queue (status, next_retry_at)
  WHERE status = 'pending';

NOTIFY pgrst, 'reload schema';
