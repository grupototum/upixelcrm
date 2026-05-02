-- Tabela de notificações por usuário
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   text    NOT NULL,
  user_id     uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text    NOT NULL,
  body        text    NOT NULL DEFAULT '',
  type        text    NOT NULL DEFAULT 'info',
  lead_id     uuid    REFERENCES leads(id) ON DELETE SET NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications (user_id, read, created_at DESC)
  WHERE read = false;
