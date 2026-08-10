CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can view own pipelines') THEN
    CREATE POLICY "Users can view own pipelines" ON public.pipelines FOR SELECT TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can insert own pipelines') THEN
    CREATE POLICY "Users can insert own pipelines" ON public.pipelines FOR INSERT TO authenticated WITH CHECK (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can update own pipelines') THEN
    CREATE POLICY "Users can update own pipelines" ON public.pipelines FOR UPDATE TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users can delete own pipelines') THEN
    CREATE POLICY "Users can delete own pipelines" ON public.pipelines FOR DELETE TO authenticated USING (client_id = public.get_user_client_id());
  END IF;
END $$;

INSERT INTO public.pipelines (client_id, name) VALUES ('c1', 'Funil Principal');