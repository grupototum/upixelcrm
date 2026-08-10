
-- Add category column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'lead' CHECK (category IN ('lead', 'partner', 'collaborator'));

-- Update existing leads to have 'lead' category if null
UPDATE public.leads SET category = 'lead' WHERE category IS NULL;
