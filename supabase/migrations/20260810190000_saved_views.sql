-- ════════════════════════════════════════════════════════════════════════
-- Views salvas (item 2 do backlog aprovado da comparação com o Twenty).
--
-- Hoje o conjunto de filtros do CRM vive só no state do React: fecha a aba,
-- perde tudo, e não há como um vendedor guardar "meus leads quentes de Meta
-- Ads acima de 5k" para voltar amanhã.
--
-- Isolamento: mesmo padrão das demais tabelas do inbox — `client_id` com
-- get_user_client_id(). A view é privada por padrão; `is_shared` libera para
-- o resto do tenant, mas só o dono edita/apaga.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  tenant_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'crm' hoje; a mesma tabela serve inbox/tarefas quando for a hora.
  scope TEXT NOT NULL DEFAULT 'crm',
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_client_scope
  ON public.saved_views (client_id, scope);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views_select" ON public.saved_views;
CREATE POLICY "saved_views_select" ON public.saved_views
  FOR SELECT TO authenticated
  USING (
    client_id = get_user_client_id()
    AND (user_id = auth.uid() OR is_shared)
  );

DROP POLICY IF EXISTS "saved_views_insert" ON public.saved_views;
CREATE POLICY "saved_views_insert" ON public.saved_views
  FOR INSERT TO authenticated
  WITH CHECK (client_id = get_user_client_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "saved_views_update" ON public.saved_views;
CREATE POLICY "saved_views_update" ON public.saved_views
  FOR UPDATE TO authenticated
  USING (client_id = get_user_client_id() AND user_id = auth.uid())
  WITH CHECK (client_id = get_user_client_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "saved_views_delete" ON public.saved_views;
CREATE POLICY "saved_views_delete" ON public.saved_views
  FOR DELETE TO authenticated
  USING (client_id = get_user_client_id() AND user_id = auth.uid());
