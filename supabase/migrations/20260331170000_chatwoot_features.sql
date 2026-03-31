
-- =============================================
-- Chatwoot-inspired features migration
-- =============================================

-- 1. Canned Responses (Respostas Rápidas com shortcode)
CREATE TABLE IF NOT EXISTS public.canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  short_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to canned_responses" ON public.canned_responses FOR ALL USING (true) WITH CHECK (true);

-- 2. Conversation Labels (etiquetas de conversa com cor)
CREATE TABLE IF NOT EXISTS public.conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL DEFAULT 'c1',
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9b87f5',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to conversation_labels" ON public.conversation_labels FOR ALL USING (true) WITH CHECK (true);

-- 3. Junction table: conversation <-> label (many-to-many)
CREATE TABLE IF NOT EXISTS public.conversation_label_assignments (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.conversation_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, label_id)
);

ALTER TABLE public.conversation_label_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to conversation_label_assignments" ON public.conversation_label_assignments FOR ALL USING (true) WITH CHECK (true);

-- 4. Expand conversations table
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS assignee_id TEXT,
  ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

-- Drop old status constraint and add expanded one
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_status_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check
  CHECK (status IN ('open','pending','resolved','snoozed','archived','closed'));

-- Add priority constraint
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_priority_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_priority_check
  CHECK (priority IN ('none','low','medium','high','urgent'));

-- 5. Expand messages table (private notes)
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text';

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_canned_responses_client ON public.canned_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_conversation_labels_client ON public.conversation_labels(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON public.conversations(assignee_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_is_private ON public.messages(is_private);

-- 7. Seed default canned responses
INSERT INTO public.canned_responses (client_id, short_code, title, content) VALUES
  ('c1', 'boasvindas', 'Boas-vindas', 'Olá {{contact.name}}! Obrigado por entrar em contato. Estamos aqui para ajudá-lo. O que posso fazer por você hoje?'),
  ('c1', 'followup', 'Follow-up', 'Olá {{contact.name}}! Gostaria de saber se teve a oportunidade de avaliar nossa proposta. Fico à disposição para qualquer dúvida!'),
  ('c1', 'obrigado', 'Agradecimento', 'Muito obrigado pela sua confiança! Estamos felizes em tê-lo como cliente. Qualquer necessidade, estamos aqui.'),
  ('c1', 'reagendar', 'Reagendamento', 'Olá {{contact.name}}! Vi que não conseguimos conversar conforme combinado. Gostaria de reagendar para um horário mais conveniente?'),
  ('c1', 'proposta', 'Proposta Enviada', 'Segue em anexo a proposta detalhada conforme conversamos. Fico no aguardo do seu retorno!'),
  ('c1', 'encerrar', 'Encerramento', 'Se houver mais alguma dúvida, estou à disposição. Desejo um ótimo dia!')
ON CONFLICT DO NOTHING;

-- 8. Seed default conversation labels
INSERT INTO public.conversation_labels (client_id, name, color) VALUES
  ('c1', 'Urgente', '#ef4444'),
  ('c1', 'Bug', '#f97316'),
  ('c1', 'Financeiro', '#22c55e'),
  ('c1', 'Suporte', '#3b82f6'),
  ('c1', 'Vendas', '#a855f7'),
  ('c1', 'Feedback', '#06b6d4')
ON CONFLICT DO NOTHING;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.canned_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_labels;
