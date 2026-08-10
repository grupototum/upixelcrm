-- 2.6: concluir tarefa registrando o que foi feito.
-- `status` já existe desde 20260324225441, com CHECK ('pending','completed',
-- 'overdue') — não é recriada aqui.

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS result       TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.tasks.result IS
  'Texto livre com o desfecho da tarefa, preenchido na conclusão (2.6).';

-- Consulta recorrente: tarefas concluídas de um lead, mais recentes primeiro.
CREATE INDEX IF NOT EXISTS idx_tasks_lead_completed
  ON public.tasks (lead_id, completed_at DESC)
  WHERE status = 'completed';
