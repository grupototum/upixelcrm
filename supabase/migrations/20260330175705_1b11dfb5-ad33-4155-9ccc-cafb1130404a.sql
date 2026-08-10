
CREATE TABLE public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL DEFAULT 'c1',
  pipeline_id text,
  column_id text,
  name text NOT NULL DEFAULT 'Nova Automação',
  active boolean NOT NULL DEFAULT true,
  trigger jsonb NOT NULL DEFAULT '{"type":"card_entered"}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation_rules in their client" ON public.automation_rules FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Users can insert automation_rules in their client" ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can update automation_rules in their client" ON public.automation_rules FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can delete automation_rules in their client" ON public.automation_rules FOR DELETE TO authenticated USING (client_id = get_user_client_id());
