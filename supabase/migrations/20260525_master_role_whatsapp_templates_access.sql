-- Master role: acesso cross-tenant em whatsapp_templates
-- O master pode ver/criar/editar templates de qualquer tenant.
-- Usuários comuns continuam restritos ao próprio tenant (políticas existentes).

CREATE POLICY "Master can view all templates"
ON public.whatsapp_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master'
  )
);

CREATE POLICY "Master can insert templates"
ON public.whatsapp_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master'
  )
);

CREATE POLICY "Master can update templates"
ON public.whatsapp_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'master'
  )
);
