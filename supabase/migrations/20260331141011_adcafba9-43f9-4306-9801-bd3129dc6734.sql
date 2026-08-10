
-- Conversations table: represents a chat thread between lead and system
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'instagram', 'webchat')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived', 'closed')),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table: individual messages in a conversation
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT 'c1',
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio', 'image', 'file', 'email')),
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view conversations in their client" ON public.conversations FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Users can insert conversations in their client" ON public.conversations FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can update conversations in their client" ON public.conversations FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can delete conversations in their client" ON public.conversations FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- RLS policies for messages
CREATE POLICY "Users can view messages in their client" ON public.messages FOR SELECT TO authenticated USING (client_id = get_user_client_id());
CREATE POLICY "Users can insert messages in their client" ON public.messages FOR INSERT TO authenticated WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can update messages in their client" ON public.messages FOR UPDATE TO authenticated USING (client_id = get_user_client_id()) WITH CHECK (client_id = get_user_client_id());
CREATE POLICY "Users can delete messages in their client" ON public.messages FOR DELETE TO authenticated USING (client_id = get_user_client_id());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Index for faster queries
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
