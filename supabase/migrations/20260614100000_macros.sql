-- =============================================
-- Macros (sequencia de acoes aplicaveis a uma conversa)
-- =============================================
--
-- Estrutura de `actions` (JSONB array):
--   [
--     { "type": "send_message",  "content": "Ola {{contact.name}}!" },
--     { "type": "update_status", "status": "resolved" },
--     { "type": "add_label",     "label_id": "<uuid>" },
--     { "type": "assign",        "user_id":  "<uuid>" },
--     { "type": "create_task",   "title": "Follow-up", "due_offset_days": 2 }
--   ]
-- =============================================

CREATE TABLE IF NOT EXISTS public.macros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT NOT NULL,
  tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  actions     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macros_client ON public.macros(client_id);

CREATE TABLE IF NOT EXISTS public.macro_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  macro_id        UUID NOT NULL REFERENCES public.macros(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  executed_by     UUID,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  results         JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_macro_executions_macro ON public.macro_executions(macro_id);
CREATE INDEX IF NOT EXISTS idx_macro_executions_conv ON public.macro_executions(conversation_id);

-- RLS using project pattern: get_user_client_id() + is_master_user()
ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view macros in their client"
  ON public.macros FOR SELECT TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can insert macros in their client"
  ON public.macros FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can update macros in their client"
  ON public.macros FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user())
  WITH CHECK (client_id = get_user_client_id() OR public.is_master_user());

CREATE POLICY "Users can delete macros in their client"
  ON public.macros FOR DELETE TO authenticated
  USING (client_id = get_user_client_id() OR public.is_master_user());

ALTER TABLE public.macro_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view macro_executions in their client"
  ON public.macro_executions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.macros m
      WHERE m.id = macro_executions.macro_id
        AND (m.client_id = get_user_client_id() OR public.is_master_user())
    )
  );

CREATE POLICY "Users can insert macro_executions in their client"
  ON public.macro_executions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.macros m
      WHERE m.id = macro_executions.macro_id
        AND m.client_id = get_user_client_id()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.macros;
