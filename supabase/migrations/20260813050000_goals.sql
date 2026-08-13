-- Spec: Change Log/130826/spec-gestao-metas-dashboard.md
--
-- "Ações do Dia" (tarefas vencidas + hoje) já existe no dashboard hoje
-- (seção "Tarefas Pendentes", DashboardPage.tsx, alimentada por
-- dashboard_kpis()) — fora do escopo desta migration. O que falta é o
-- sistema de metas em si.
--
-- `stage_id REFERENCES pipeline_stages(id)` do spec original não existe
-- neste projeto — a tabela de etapas é `pipeline_columns` (mesmo ajuste já
-- feito em spec-kanban-column-description.md).

CREATE TABLE IF NOT EXISTS public.goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL,
  tenant_id    UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  metric       TEXT NOT NULL CHECK (metric IN ('leads_created', 'tasks_completed', 'contacts_made', 'leads_closed')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  period       TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  assigned_to  UUID REFERENCES auth.users(id),
  column_id    UUID REFERENCES public.pipeline_columns(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_client_id ON public.goals(client_id);
CREATE INDEX IF NOT EXISTS idx_goals_assigned_to ON public.goals(assigned_to);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on goals"
  ON public.goals FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = public.get_user_client_id() OR public.is_master_user());

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
