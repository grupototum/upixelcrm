-- 2.7: descrição por etapa do funil.
-- A tabela de etapas é `pipeline_columns` (20260324225441) — não
-- `pipeline_stages`.

ALTER TABLE public.pipeline_columns
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Teto de 300 caracteres, espelhando o contador do modal de edição.
-- NOT VALID: não recusa a migration por causa de linha legada fora do limite;
-- a regra passa a valer para toda escrita nova.
ALTER TABLE public.pipeline_columns
  DROP CONSTRAINT IF EXISTS pipeline_columns_description_len;

ALTER TABLE public.pipeline_columns
  ADD CONSTRAINT pipeline_columns_description_len
  CHECK (description IS NULL OR char_length(description) <= 300) NOT VALID;

COMMENT ON COLUMN public.pipeline_columns.description IS
  'O que significa um lead estar nesta etapa. Máx 300 caracteres (2.7).';
