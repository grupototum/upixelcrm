
-- Create pipeline_columns table
CREATE TABLE public.pipeline_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id TEXT NOT NULL DEFAULT 'p1',
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pipeline_columns" ON public.pipeline_columns FOR ALL USING (true) WITH CHECK (true);

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  "position" TEXT,
  city TEXT,
  notes TEXT,
  origin TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  column_id UUID REFERENCES public.pipeline_columns(id) ON DELETE SET NULL,
  responsible_id TEXT,
  value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  due_date DATE,
  assigned_to TEXT DEFAULT 'Você',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- Create timeline_events table
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'stage_change', 'note', 'task', 'automation', 'call')),
  content TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to timeline_events" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_leads_column_id ON public.leads(column_id);
CREATE INDEX idx_leads_client_id ON public.leads(client_id);
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX idx_timeline_events_lead_id ON public.timeline_events(lead_id);
CREATE INDEX idx_pipeline_columns_order ON public.pipeline_columns("order");
