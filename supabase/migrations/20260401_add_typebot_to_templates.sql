
-- Add typebot_flow_id to whatsapp_templates
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS typebot_flow_id TEXT;

-- Update RLS or other constraints if necessary (none needed for a simple text column)
