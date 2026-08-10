
-- Table for WhatsApp Templates Management
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own templates"
ON public.whatsapp_templates FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

CREATE POLICY "Clients can create their own templates"
ON public.whatsapp_templates FOR INSERT
TO authenticated
WITH CHECK (client_id::text = (select get_user_client_id()));

CREATE POLICY "Clients can update their own templates"
ON public.whatsapp_templates FOR UPDATE
TO authenticated
USING (client_id::text = (select get_user_client_id()));
