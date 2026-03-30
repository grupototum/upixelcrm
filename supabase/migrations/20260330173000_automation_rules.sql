-- Create automation_rules table for basic column-specific automations
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
  column_id UUID REFERENCES public.pipeline_columns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  trigger JSONB NOT NULL DEFAULT '{}'::JSONB,
  actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  exceptions JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can insert automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can update automation_rules in their client" ON public.automation_rules;
  DROP POLICY IF EXISTS "Users can delete automation_rules in their client" ON public.automation_rules;
END $$;

-- Create Scoped RLS Policies
CREATE POLICY "Users can view automation_rules in their client"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id());

CREATE POLICY "Users can insert automation_rules in their client"
  ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can update automation_rules in their client"
  ON public.automation_rules FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id())
  WITH CHECK (client_id = public.get_user_client_id());

CREATE POLICY "Users can delete automation_rules in their client"
  ON public.automation_rules FOR DELETE TO authenticated
  USING (client_id = public.get_user_client_id());

-- Updated at trigger
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
