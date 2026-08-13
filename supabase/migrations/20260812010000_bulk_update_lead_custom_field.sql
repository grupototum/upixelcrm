-- Edição em massa de leads (Kanban): campo customizado.
-- Campos padrão (name/email/phone/...) são um UPDATE direto de coluna e não
-- precisam de RPC — só o merge no JSONB custom_fields exige SQL set-based
-- (senão dois updates concorrentes num mesmo lead pisam um no outro).
--
-- SECURITY INVOKER (default): roda com o papel de quem chama, então a RLS de
-- "leads" já existente decide quais linhas são de fato atualizadas — sem
-- checagem de tenant duplicada aqui.
CREATE OR REPLACE FUNCTION public.bulk_update_lead_custom_field(
  p_lead_ids UUID[],
  p_slug TEXT,
  p_value TEXT
) RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH updated AS (
    UPDATE public.leads
    SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object(p_slug, p_value),
        updated_at = now()
    WHERE id = ANY(p_lead_ids)
    RETURNING id
  )
  SELECT count(*)::integer FROM updated;
$$;
