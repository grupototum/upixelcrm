
-- Table to store current credit balance per client
CREATE TABLE IF NOT EXISTS public.client_credits (
    client_id UUID PRIMARY KEY, -- Reference to the organization/client
    balance NUMERIC DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to track recharge intents and payment statuses
CREATE TABLE IF NOT EXISTS public.recharge_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    amount NUMERIC NOT NULL, -- Amount in BRL
    credits_to_add NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    external_id TEXT, -- Asaas Payment ID
    payment_link TEXT, -- Asaas Checkout/Pix Link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_intents ENABLE ROW LEVEL SECURITY;

-- Note: In a production environment, you should use client_id based on a JWT claim 
-- (e.g., auth.uid() or a custom claim). Here we assume the app passes client_id correctly.

CREATE POLICY "Clients can view their own credits"
ON public.client_credits FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

CREATE POLICY "Clients can view their own recharge intents"
ON public.recharge_intents FOR SELECT
TO authenticated
USING (client_id::text = (select get_user_client_id()));

-- Function to handle balance increment (atomic)
CREATE OR REPLACE FUNCTION public.increment_client_credits(client_id_param UUID, amount_param NUMERIC)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.client_credits (client_id, balance)
    VALUES (client_id_param, amount_param)
    ON CONFLICT (client_id)
    DO UPDATE SET 
        balance = client_credits.balance + amount_param,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
