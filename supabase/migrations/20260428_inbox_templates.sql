-- ============================================================================
-- Inbox Templates / Canned Responses
-- ============================================================================
-- Tabela única que suporta:
--   • Templates de mensagem (modelos prontos para clicar e usar)
--   • Respostas rápidas (acionadas por /short_code no campo de mensagem)
--
-- Se short_code estiver preenchido, o template aparece no picker de "/" no
-- ReplyBox. Sempre aparece no MessageTemplatePopover.
--
-- Convenção do schema:
--   client_id é TEXT (UUID em string), sem FK
--   tenant_id é UUID com FK em public.tenants
--   RLS via public.get_user_client_id() / public.is_master_user()
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inbox_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT        NOT NULL,
  tenant_id    UUID        REFERENCES public.tenants(id) ON DELETE CASCADE,
  short_code   TEXT,                                        -- ex: "ola" → /ola
  title        TEXT        NOT NULL,                        -- ex: "Saudação"
  content      TEXT        NOT NULL,                        -- corpo da mensagem
  category     TEXT        NOT NULL DEFAULT 'template',     -- 'template' | 'quick_reply'
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_templates_client    ON public.inbox_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_inbox_templates_short     ON public.inbox_templates(client_id, short_code) WHERE short_code IS NOT NULL;

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_inbox_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inbox_templates_updated_at ON public.inbox_templates;
CREATE TRIGGER trg_inbox_templates_updated_at
  BEFORE UPDATE ON public.inbox_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_inbox_templates_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.inbox_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation on inbox_templates" ON public.inbox_templates;
CREATE POLICY "Tenant isolation on inbox_templates"
  ON public.inbox_templates FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id() OR public.is_master_user()
  )
  WITH CHECK (
    client_id = public.get_user_client_id() OR public.is_master_user()
  );
