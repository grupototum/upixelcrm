-- ─────────────────────────────────────────────────────────────
-- Lead matching unificado para todos os canais
--
-- Centraliza a logica de "achar lead existente OU criar novo"
-- numa unica funcao Postgres chamada por:
--   - whatsapp-webhook (Lite + Official)
--   - instagram-webhook
--   - useInbox.findOrCreateLead (form de nova conversa)
--
-- Estrategia de matching (em ordem de prioridade):
--   1. Telefone normalizado (digitos) com mesmo sufixo de 8 digitos
--   2. Email exato (lowercase + trim)
--   3. Instagram ID exato
--   4. Facebook ID exato
--   5. Nome normalizado IDENTICO + qualquer telefone parcial em comum
--      (so faz match por nome se ja houver pelo menos um digito de telefone batendo)
--
-- Se mais de um lead bater, mescla todos no mais antigo (oldest wins).
-- Se nada bater, cria novo lead na primeira coluna do pipeline.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Colunas auxiliares na tabela leads ────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram_id TEXT,
  ADD COLUMN IF NOT EXISTS facebook_id  TEXT;

-- ── 2. Backfill: mover IGSID que estava em leads.phone ────────
-- Leads criados pelo instagram-webhook colocavam o IGSID na coluna phone.
-- IGSID tem 17+ digitos e nao parece um telefone real, entao migramos.
UPDATE public.leads
   SET instagram_id = phone,
       phone        = NULL
 WHERE instagram_id IS NULL
   AND phone IS NOT NULL
   AND (
     'instagram-auto' = ANY(tags)
     OR origin = 'instagram'
     OR length(regexp_replace(phone, '\D', '', 'g')) >= 16
   );

-- ── 3. Indices para lookup rapido ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_phone_digits
  ON public.leads (client_id, regexp_replace(phone, '\D', '', 'g'))
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone_suffix8
  ON public.leads (client_id, RIGHT(regexp_replace(phone, '\D', '', 'g'), 8))
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_lower
  ON public.leads (client_id, lower(trim(email)))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_instagram_id
  ON public.leads (client_id, instagram_id)
  WHERE instagram_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_facebook_id
  ON public.leads (client_id, facebook_id)
  WHERE facebook_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_name_lower
  ON public.leads (client_id, lower(trim(name)))
  WHERE name IS NOT NULL;

-- ── 4. Helpers de normalizacao ────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(e TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(trim(COALESCE(e, ''))), '');
$$;

CREATE OR REPLACE FUNCTION public.normalize_name(n TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(trim(regexp_replace(COALESCE(n, ''), '\s+', ' ', 'g'))), '');
$$;

-- ── 5. Helper: primeira coluna do pipeline (cria pipeline padrao se faltar) ──
CREATE OR REPLACE FUNCTION public.default_pipeline_column(p_client_id TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_col_id UUID;
BEGIN
  SELECT id INTO v_col_id
    FROM public.pipeline_columns
   WHERE client_id = p_client_id
   ORDER BY "order" ASC
   LIMIT 1;

  IF v_col_id IS NULL THEN
    INSERT INTO public.pipeline_columns (client_id, name, "order", color) VALUES
      (p_client_id, 'Novo',          0, '#3b82f6'),
      (p_client_id, 'Em Atendimento',1, '#f59e0b'),
      (p_client_id, 'Negociação',    2, '#8b5cf6'),
      (p_client_id, 'Ganho',         3, '#10b981'),
      (p_client_id, 'Perdido',       4, '#ef4444')
    RETURNING id INTO v_col_id;
  END IF;

  RETURN v_col_id;
END $$;

-- ── 6. Helper: mescla N leads no primario (oldest wins) ───────
CREATE OR REPLACE FUNCTION public.merge_leads_into(
  p_primary_id UUID,
  p_duplicate_ids UUID[]
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_merged_tags TEXT[];
  v_merged_notes TEXT;
  v_primary RECORD;
  v_dup RECORD;
BEGIN
  IF array_length(p_duplicate_ids, 1) IS NULL OR array_length(p_duplicate_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Reaponta registros relacionados para o lead primario
  UPDATE public.conversations   SET lead_id = p_primary_id WHERE lead_id = ANY(p_duplicate_ids);
  UPDATE public.tasks           SET lead_id = p_primary_id WHERE lead_id = ANY(p_duplicate_ids);
  UPDATE public.timeline_events SET lead_id = p_primary_id WHERE lead_id = ANY(p_duplicate_ids);

  -- Mescla tags + notes + preenche campos vazios do primario
  SELECT * INTO v_primary FROM public.leads WHERE id = p_primary_id;
  v_merged_tags  := COALESCE(v_primary.tags, '{}'::TEXT[]);
  v_merged_notes := COALESCE(v_primary.notes, '');

  FOR v_dup IN SELECT * FROM public.leads WHERE id = ANY(p_duplicate_ids) LOOP
    -- Tags unicas
    FOR i IN 1..COALESCE(array_length(v_dup.tags, 1), 0) LOOP
      IF NOT (v_dup.tags[i] = ANY(v_merged_tags)) THEN
        v_merged_tags := array_append(v_merged_tags, v_dup.tags[i]);
      END IF;
    END LOOP;
    -- Notes
    IF v_dup.notes IS NOT NULL AND v_dup.notes <> '' THEN
      v_merged_notes := v_merged_notes || E'\n[Mesclado de ' || v_dup.id::TEXT || ']: ' || v_dup.notes;
    END IF;
    -- Campos faltantes no primario, presentes no duplicado
    IF v_primary.email        IS NULL AND v_dup.email        IS NOT NULL THEN UPDATE public.leads SET email        = v_dup.email        WHERE id = p_primary_id; END IF;
    IF v_primary.phone        IS NULL AND v_dup.phone        IS NOT NULL THEN UPDATE public.leads SET phone        = v_dup.phone        WHERE id = p_primary_id; END IF;
    IF v_primary.instagram_id IS NULL AND v_dup.instagram_id IS NOT NULL THEN UPDATE public.leads SET instagram_id = v_dup.instagram_id WHERE id = p_primary_id; END IF;
    IF v_primary.facebook_id  IS NULL AND v_dup.facebook_id  IS NOT NULL THEN UPDATE public.leads SET facebook_id  = v_dup.facebook_id  WHERE id = p_primary_id; END IF;
    IF v_primary.company      IS NULL AND v_dup.company      IS NOT NULL THEN UPDATE public.leads SET company      = v_dup.company      WHERE id = p_primary_id; END IF;
  END LOOP;

  UPDATE public.leads
     SET tags  = v_merged_tags,
         notes = NULLIF(v_merged_notes, ''),
         updated_at = now()
   WHERE id = p_primary_id;

  -- Remove os duplicados
  DELETE FROM public.leads WHERE id = ANY(p_duplicate_ids);
END $$;

-- ── 7. Funcao principal: match_or_create_lead ─────────────────
-- Retorna jsonb {lead_id, created, merged_count} para que o caller
-- saiba se deve disparar automacao/notificacao de novo lead.
CREATE OR REPLACE FUNCTION public.match_or_create_lead(
  p_client_id    TEXT,
  p_phone        TEXT DEFAULT NULL,
  p_email        TEXT DEFAULT NULL,
  p_instagram_id TEXT DEFAULT NULL,
  p_facebook_id  TEXT DEFAULT NULL,
  p_name         TEXT DEFAULT 'Desconhecido',
  p_origin       TEXT DEFAULT 'inbox',
  p_target_column_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_phone_digits TEXT;
  v_phone_sfx8   TEXT;
  v_email_norm   TEXT;
  v_name_norm    TEXT;
  v_ig_norm      TEXT;
  v_fb_norm      TEXT;
  v_lead_ids     UUID[] := '{}';
  v_primary_id   UUID;
  v_duplicates   UUID[];
  v_col_id       UUID;
  v_new_id       UUID;
BEGIN
  v_phone_digits := public.normalize_phone(p_phone);
  v_phone_sfx8   := CASE WHEN v_phone_digits IS NOT NULL AND length(v_phone_digits) >= 8
                         THEN RIGHT(v_phone_digits, 8) ELSE NULL END;
  v_email_norm   := public.normalize_email(p_email);
  v_name_norm    := public.normalize_name(p_name);
  v_ig_norm      := NULLIF(trim(p_instagram_id), '');
  v_fb_norm      := NULLIF(trim(p_facebook_id), '');

  -- 1) Match por telefone (sufixo 8 digitos) -- alta confianca
  IF v_phone_sfx8 IS NOT NULL THEN
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_lead_ids
      FROM public.leads
     WHERE client_id = p_client_id
       AND phone IS NOT NULL
       AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 8) = v_phone_sfx8;
  END IF;

  -- 2) Match por email exato (se ainda nao achou)
  IF (v_lead_ids IS NULL OR array_length(v_lead_ids, 1) IS NULL) AND v_email_norm IS NOT NULL THEN
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_lead_ids
      FROM public.leads
     WHERE client_id = p_client_id
       AND email IS NOT NULL
       AND lower(trim(email)) = v_email_norm;
  END IF;

  -- 3) Match por instagram_id
  IF (v_lead_ids IS NULL OR array_length(v_lead_ids, 1) IS NULL) AND v_ig_norm IS NOT NULL THEN
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_lead_ids
      FROM public.leads
     WHERE client_id = p_client_id
       AND instagram_id = v_ig_norm;
  END IF;

  -- 4) Match por facebook_id
  IF (v_lead_ids IS NULL OR array_length(v_lead_ids, 1) IS NULL) AND v_fb_norm IS NOT NULL THEN
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_lead_ids
      FROM public.leads
     WHERE client_id = p_client_id
       AND facebook_id = v_fb_norm;
  END IF;

  -- 5) Match por nome IDENTICO normalizado, mas SO se houver tambem
  --    algum telefone parcial em comum (>= 6 digitos finais).
  --    Reduz falso-positivo (xara nao vira a mesma pessoa).
  IF (v_lead_ids IS NULL OR array_length(v_lead_ids, 1) IS NULL)
     AND v_name_norm IS NOT NULL
     AND v_phone_digits IS NOT NULL
     AND length(v_phone_digits) >= 6 THEN
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_lead_ids
      FROM public.leads
     WHERE client_id = p_client_id
       AND lower(trim(name)) = v_name_norm
       AND phone IS NOT NULL
       AND RIGHT(regexp_replace(phone, '\D', '', 'g'), 6) = RIGHT(v_phone_digits, 6);
  END IF;

  -- ── Achou: mescla N->1 e devolve o sobrevivente ──
  IF v_lead_ids IS NOT NULL AND array_length(v_lead_ids, 1) >= 1 THEN
    v_primary_id := v_lead_ids[1];
    IF array_length(v_lead_ids, 1) > 1 THEN
      v_duplicates := v_lead_ids[2:array_length(v_lead_ids, 1)];
      PERFORM public.merge_leads_into(v_primary_id, v_duplicates);
    END IF;

    -- Enriquece o lead com identifiers que ele ainda nao tinha
    UPDATE public.leads
       SET phone        = COALESCE(phone,        p_phone),
           email        = COALESCE(email,        p_email),
           instagram_id = COALESCE(instagram_id, v_ig_norm),
           facebook_id  = COALESCE(facebook_id,  v_fb_norm),
           updated_at   = now()
     WHERE id = v_primary_id;

    RETURN jsonb_build_object(
      'lead_id', v_primary_id,
      'created', false,
      'merged_count', COALESCE(array_length(v_duplicates, 1), 0)
    );
  END IF;

  -- ── Nao achou: cria lead novo ──
  v_col_id := COALESCE(p_target_column_id, public.default_pipeline_column(p_client_id));

  INSERT INTO public.leads (
    client_id, name, phone, email, instagram_id, facebook_id,
    column_id, origin, tags
  ) VALUES (
    p_client_id,
    COALESCE(NULLIF(trim(p_name), ''), 'Desconhecido'),
    p_phone,
    p_email,
    v_ig_norm,
    v_fb_norm,
    v_col_id,
    p_origin,
    ARRAY[p_origin || '-auto']
  ) RETURNING id INTO v_new_id;

  -- Timeline
  INSERT INTO public.timeline_events (client_id, lead_id, type, content, user_name)
  VALUES (p_client_id, v_new_id, 'stage_change',
          'Lead "' || COALESCE(p_name, 'Desconhecido') || '" criado automaticamente via ' || p_origin,
          'Sistema');

  RETURN jsonb_build_object(
    'lead_id', v_new_id,
    'created', true,
    'merged_count', 0
  );
END $$;

GRANT EXECUTE ON FUNCTION public.match_or_create_lead(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.merge_leads_into(UUID, UUID[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.default_pipeline_column(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.normalize_email(TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.normalize_name(TEXT)  TO authenticated, service_role, anon;
