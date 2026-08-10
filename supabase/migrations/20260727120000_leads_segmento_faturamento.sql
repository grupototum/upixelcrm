-- Campos adicionais no cadastro de leads: Segmento e Faturamento Mensal.
-- Responsável já usa a coluna existente leads.responsible_id (nenhuma alteração).
-- Colunas aditivas/nullable — leads existentes ficam NULL. As policies de RLS
-- já existentes em leads cobrem estas colunas (não precisa de policy nova).

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS segmento TEXT,
  ADD COLUMN IF NOT EXISTS faturamento_mensal NUMERIC;

COMMENT ON COLUMN public.leads.segmento IS 'Segmento / ramo de atuação do lead';
COMMENT ON COLUMN public.leads.faturamento_mensal IS 'Faturamento mensal estimado do lead (R$)';
