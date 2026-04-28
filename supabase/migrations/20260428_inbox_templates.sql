-- ============================================================================
-- Inbox Templates / Canned Responses
-- ============================================================================
-- Tabela única que suporta:
--   • Templates de mensagem (modelos prontos para clicar e usar)
--   • Respostas rápidas (acionadas por /short_code no campo de mensagem)
--
-- Se short_code estiver preenchido, o template aparece no picker de "/" no
-- ReplyBox. Sempre aparece no MessageTemplatePopover.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inbox_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
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

DROP POLICY IF EXISTS "inbox_templates_select" ON public.inbox_templates;
CREATE POLICY "inbox_templates_select"
  ON public.inbox_templates FOR SELECT
  USING (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

DROP POLICY IF EXISTS "inbox_templates_insert" ON public.inbox_templates;
CREATE POLICY "inbox_templates_insert"
  ON public.inbox_templates FOR INSERT
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

DROP POLICY IF EXISTS "inbox_templates_update" ON public.inbox_templates;
CREATE POLICY "inbox_templates_update"
  ON public.inbox_templates FOR UPDATE
  USING (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

DROP POLICY IF EXISTS "inbox_templates_delete" ON public.inbox_templates;
CREATE POLICY "inbox_templates_delete"
  ON public.inbox_templates FOR DELETE
  USING (
    client_id IN (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  );

-- ─── Seed: templates padrão por client ──────────────────────────────────────
-- Insere apenas se o client ainda não tem templates
INSERT INTO public.inbox_templates (client_id, title, content, category, short_code)
SELECT
  c.id,
  t.title,
  t.content,
  t.category,
  t.short_code
FROM public.clients c
CROSS JOIN (
  VALUES
    ('Saudação',       'Olá! Como posso ajudá-lo hoje?',                                                             'quick_reply', 'ola'),
    ('Agradecimento',  'Obrigado pelo seu contato! Estamos à disposição.',                                            'quick_reply', 'obrigado'),
    ('Boas-vindas',    'Olá! Obrigado por entrar em contato. Estamos aqui para ajudá-lo. O que posso fazer por você hoje?', 'template', NULL),
    ('Follow-up',      'Olá! Gostaria de saber se teve a oportunidade de avaliar nossa proposta. Fico à disposição para qualquer dúvida!', 'template', NULL),
    ('Reagendamento',  'Olá! Vi que não conseguimos conversar conforme combinado. Gostaria de reagendar para um horário mais conveniente?', 'template', NULL),
    ('Encerramento',   'Se houver mais alguma dúvida, estou à disposição. Desejo um ótimo dia!',                       'template', NULL)
) AS t(title, content, category, short_code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inbox_templates WHERE client_id = c.id
);
