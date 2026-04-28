-- ============================================================================
-- Fix: Adiciona colunas faltantes em custom_field_definitions
-- Idempotente - pode rodar quantas vezes precisar
-- ============================================================================

-- Adiciona client_id (TEXT, obrigatório)
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Adiciona tenant_id (UUID, FK para tenants)
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Adiciona slug (TEXT, obrigatório)
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Adiciona field_type
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS field_type TEXT NOT NULL DEFAULT 'text';

-- Adiciona options (JSONB)
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Adiciona is_required
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false;

-- Adiciona visible_pipelines (JSONB)
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS visible_pipelines JSONB DEFAULT '[]'::jsonb;

-- Adiciona display_order
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Adiciona timestamps
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Cria UNIQUE constraint (client_id, slug) se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_field_definitions_client_id_slug_key'
  ) THEN
    ALTER TABLE public.custom_field_definitions
      ADD CONSTRAINT custom_field_definitions_client_id_slug_key
      UNIQUE (client_id, slug);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_client_id
  ON public.custom_field_definitions(client_id);

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_tenant_id
  ON public.custom_field_definitions(tenant_id);

-- RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on custom_field_definitions" ON public.custom_field_definitions;
CREATE POLICY "Tenant isolation on custom_field_definitions"
  ON public.custom_field_definitions FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR
    public.is_master_user()
  );

-- Força refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
