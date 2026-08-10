
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL DEFAULT 'c1',
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations in their client"
ON public.integrations FOR SELECT TO authenticated
USING (client_id = get_user_client_id());

CREATE POLICY "Users can insert integrations in their client"
ON public.integrations FOR INSERT TO authenticated
WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can update integrations in their client"
ON public.integrations FOR UPDATE TO authenticated
USING (client_id = get_user_client_id())
WITH CHECK (client_id = get_user_client_id());

CREATE POLICY "Users can delete integrations in their client"
ON public.integrations FOR DELETE TO authenticated
USING (client_id = get_user_client_id());

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
