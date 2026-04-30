-- Temporary storage for in-flight Meta OAuth sessions.
-- After the user authorizes on Meta and we exchange the code for an access_token,
-- we discover their available WABAs / IG accounts / ad accounts and store them
-- here with a short TTL. The user then picks which account to connect on the
-- tenant subdomain, and we promote the selected one into the integrations table.

CREATE TABLE IF NOT EXISTS public.meta_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  tenant_subdomain TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'ads', 'all')),
  access_token TEXT NOT NULL,
  discovered JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_sessions_user
  ON public.meta_oauth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_sessions_expires
  ON public.meta_oauth_sessions(expires_at);

ALTER TABLE public.meta_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read their own session
CREATE POLICY "users_read_own_oauth_session"
  ON public.meta_oauth_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role bypasses RLS by default; no INSERT/UPDATE/DELETE policies needed
-- because all writes happen via the Edge Function with the service role key.

-- Cleanup function to remove expired sessions (called periodically by pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_meta_oauth_sessions()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.meta_oauth_sessions
  WHERE expires_at < now() - interval '1 hour';
$$;
