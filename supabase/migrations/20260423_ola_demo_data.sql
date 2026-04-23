-- ════════════════════════════════════════════════════════════
-- Dados demonstrativos para ola.upixel.app
-- Tenant: 3544da7e-5714-4206-a4a6-f223917919fa
-- Login: ola@upixel.app / Demo@2026!
-- ════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tenant_id  UUID := '3544da7e-5714-4206-a4a6-f223917919fa';
  v_client_id  TEXT := '3544da7e-5714-4206-a4a6-f223917919fa';
  v_user_id    UUID;

  -- Pipeline + columns
  v_pipeline_id    UUID := gen_random_uuid();
  v_col_novo       UUID := gen_random_uuid();
  v_col_contato    UUID := gen_random_uuid();
  v_col_proposta   UUID := gen_random_uuid();
  v_col_negociacao UUID := gen_random_uuid();
  v_col_ganho      UUID := gen_random_uuid();
  v_col_perdido    UUID := gen_random_uuid();

  -- Leads
  v_l1  UUID := gen_random_uuid();
  v_l2  UUID := gen_random_uuid();
  v_l3  UUID := gen_random_uuid();
  v_l4  UUID := gen_random_uuid();
  v_l5  UUID := gen_random_uuid();
  v_l6  UUID := gen_random_uuid();
  v_l7  UUID := gen_random_uuid();
  v_l8  UUID := gen_random_uuid();
  v_l9  UUID := gen_random_uuid();
  v_l10 UUID := gen_random_uuid();
  v_l11 UUID := gen_random_uuid();
  v_l12 UUID := gen_random_uuid();

  -- Conversations
  v_c1 UUID := gen_random_uuid();
  v_c2 UUID := gen_random_uuid();
  v_c3 UUID := gen_random_uuid();
  v_c4 UUID := gen_random_uuid();
  v_c5 UUID := gen_random_uuid();

BEGIN

  -- ── 1. Usuário ola@upixel.app ───────────────────────────────
  -- Remove se já existir (pra permitir re-rodar)
  DELETE FROM auth.users WHERE email = 'ola@upixel.app';

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'ola@upixel.app',
    crypt('Demo@2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Demo uPixel',
      'role', 'supervisor',
      'tenant_id', v_tenant_id::text
    ),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Vincula como owner do tenant
  UPDATE public.tenants SET owner_id = v_user_id WHERE id = v_tenant_id;

  -- Garante que o profile ficou com tenant_id correto (trigger handle_new_user criou)
  UPDATE public.profiles
  SET client_id = v_client_id,
      tenant_id = v_tenant_id,
      role = 'supervisor',
      name = 'Demo uPixel'
  WHERE id = v_user_id;

  -- ── 2. Pipeline + Colunas ───────────────────────────────────
  INSERT INTO public.pipelines (id, name, client_id, tenant_id, created_at)
  VALUES (v_pipeline_id, 'Funil de Vendas', v_client_id, v_tenant_id, now());

  INSERT INTO public.pipeline_columns (id, pipeline_id, name, "order", color, client_id, tenant_id)
  VALUES
    (v_col_novo,       v_pipeline_id, 'Novo Lead',        0, '#6366f1', v_client_id, v_tenant_id),
    (v_col_contato,    v_pipeline_id, 'Em Contato',       1, '#8b5cf6', v_client_id, v_tenant_id),
    (v_col_proposta,   v_pipeline_id, 'Proposta Enviada', 2, '#f59e0b', v_client_id, v_tenant_id),
    (v_col_negociacao, v_pipeline_id, 'Em Negociação',    3, '#ef4444', v_client_id, v_tenant_id),
    (v_col_ganho,      v_pipeline_id, 'Fechado Ganho',    4, '#10b981', v_client_id, v_tenant_id),
    (v_col_perdido,    v_pipeline_id, 'Fechado Perdido',  5, '#6b7280', v_client_id, v_tenant_id);

  -- ── 3. Leads ────────────────────────────────────────────────
  INSERT INTO public.leads
    (id, name, phone, email, company, city, category, origin, tags, notes, value,
     column_id, client_id, tenant_id, created_at)
  VALUES
    (v_l1, 'Carlos Mendonça', '(11) 98001-1234', 'carlos@alphaconstr.com.br',
     'Alpha Construtora', 'São Paulo', 'lead', 'indicacao',
     ARRAY['construção','premium']::text[],
     'Interessado em CRM para equipe de 12 vendedores. Reunião marcada para sexta.',
     85000, v_col_negociacao, v_client_id, v_tenant_id, now() - interval '8 days'),

    (v_l2, 'Fernanda Rocha', '(21) 97002-5678', 'fernanda@techsol.com.br',
     'TechSolutions Ltda', 'Rio de Janeiro', 'lead', 'site',
     ARRAY['tecnologia','startup']::text[],
     'CEO de startup. Testando plataforma gratuitamente.',
     42000, v_col_proposta, v_client_id, v_tenant_id, now() - interval '5 days'),

    (v_l3, 'Ricardo Alves', '(31) 96003-9012', 'r.alves@saudeplus.com.br',
     'Farmácia Saúde+', 'Belo Horizonte', 'lead', 'whatsapp',
     ARRAY['saúde','franquia']::text[],
     'Rede com 3 unidades. Quer centralizar atendimento WhatsApp.',
     18000, v_col_contato, v_client_id, v_tenant_id, now() - interval '3 days'),

    (v_l4, 'Juliana Castro', '(41) 95004-3456', 'ju@fitlife.com.br',
     'FitLife Academia', 'Curitiba', 'lead', 'instagram',
     ARRAY['fitness','academia']::text[],
     'Academia com 800 alunos. Automação de renovação de matrícula.',
     12000, v_col_contato, v_client_id, v_tenant_id, now() - interval '2 days'),

    (v_l5, 'Bruno Pimentel', '(51) 94005-7890', 'bruno@imobprime.com.br',
     'ImobPrime Imóveis', 'Porto Alegre', 'lead', 'google',
     ARRAY['imóveis','premium','corporativo']::text[],
     'Imobiliária com 25 corretores. Integração com portais.',
     130000, v_col_negociacao, v_client_id, v_tenant_id, now() - interval '12 days'),

    (v_l6, 'Amanda Ferreira', '(62) 93006-2345', 'amanda@educamais.com.br',
     'EducaMais Cursos', 'Goiânia', 'lead', 'site',
     ARRAY['educação','cursos']::text[],
     'Plataforma de cursos online. CRM para captação de alunos.',
     28000, v_col_proposta, v_client_id, v_tenant_id, now() - interval '6 days'),

    (v_l7, 'Marcos Tavares', '(85) 92007-6789', 'marcos@agromarcas.com.br',
     'AgroMarcas', 'Fortaleza', 'lead', 'indicacao',
     ARRAY['agro','b2b']::text[],
     'Distribuidora agrícola. Equipe de 8 vendedores externos.',
     67000, v_col_novo, v_client_id, v_tenant_id, now() - interval '1 day'),

    (v_l8, 'Priscila Nunes', '(71) 91008-0123', 'pri@clinicavida.com.br',
     'Clínica Vida', 'Salvador', 'lead', 'whatsapp',
     ARRAY['saúde','clínica']::text[],
     'Clínica com 6 especialidades. Agendamento e follow-up.',
     22000, v_col_novo, v_client_id, v_tenant_id, now() - interval '1 day'),

    (v_l9, 'Thiago Carvalho', '(19) 90009-4567', 'thiago@logiexpress.com.br',
     'LogiExpress', 'Campinas', 'cliente', 'indicacao',
     ARRAY['logística','transporte']::text[],
     'Contrato fechado! Onboarding agendado.',
     95000, v_col_ganho, v_client_id, v_tenant_id, now() - interval '20 days'),

    (v_l10, 'Daniela Souza', '(48) 89010-8901', 'dani@varejoda.com.br',
     'Varejo DA', 'Florianópolis', 'lead', 'site',
     ARRAY['varejo']::text[],
     'Optou pela concorrência. Decisão por preço.',
     35000, v_col_perdido, v_client_id, v_tenant_id, now() - interval '15 days'),

    (v_l11, 'Eduardo Lima', '(61) 88011-2345', 'edu@govtech.com.br',
     'GovTech Soluções', 'Brasília', 'lead', 'indicacao',
     ARRAY['governo','b2g','corporativo']::text[],
     'Empresa pública. Licitação em andamento.',
     250000, v_col_negociacao, v_client_id, v_tenant_id, now() - interval '30 days'),

    (v_l12, 'Sabrina Martins', '(11) 87012-6789', 'sabrina@belavida.com.br',
     'BelaVida Estética', 'São Paulo', 'lead', 'instagram',
     ARRAY['estética','beleza','sme']::text[],
     'Clínica de estética. Automatizar confirmação de agendamentos.',
     9500, v_col_contato, v_client_id, v_tenant_id, now());

  -- ── 4. Conversas ────────────────────────────────────────────
  INSERT INTO public.conversations
    (id, lead_id, channel, status, last_message, last_message_at, unread_count, client_id, tenant_id, created_at)
  VALUES
    (v_c1, v_l1, 'whatsapp', 'open',
     'Perfeito! Sexta às 14h. Vou preparar uma apresentação personalizada.',
     now() - interval '2 hours', 0, v_client_id, v_tenant_id, now() - interval '8 days'),
    (v_c2, v_l2, 'whatsapp', 'open',
     'A proposta está no seu e-mail. Qualquer dúvida me chame aqui.',
     now() - interval '5 hours', 1, v_client_id, v_tenant_id, now() - interval '5 days'),
    (v_c3, v_l5, 'whatsapp', 'open',
     'Vou ajustar o contrato com as condições que discutimos e envio hoje.',
     now() - interval '1 hour', 0, v_client_id, v_tenant_id, now() - interval '12 days'),
    (v_c4, v_l9, 'email', 'closed',
     'Contrato assinado recebido! Bem-vindo ao uPixel.',
     now() - interval '3 days', 0, v_client_id, v_tenant_id, now() - interval '20 days'),
    (v_c5, v_l3, 'whatsapp', 'open',
     'Olá Ricardo! Passando para confirmar se recebeu o material.',
     now() - interval '30 minutes', 2, v_client_id, v_tenant_id, now() - interval '3 days');

  -- ── 5. Mensagens ────────────────────────────────────────────
  INSERT INTO public.messages
    (conversation_id, content, direction, type, sender_name, client_id, tenant_id, created_at)
  VALUES
    -- Conv 1 - Carlos
    (v_c1, 'Oi! Vi o uPixel no LinkedIn. Vocês atendem equipes de 12 pessoas?', 'inbound', 'text', 'Carlos Mendonça', v_client_id, v_tenant_id, now() - interval '8 days'),
    (v_c1, 'Olá Carlos! Sim, equipes de todos os tamanhos. Você tem disponibilidade para uma chamada de 30 min?', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '8 days' + interval '1 hour'),
    (v_c1, 'Sim! Sexta de manhã seria perfeito.', 'inbound', 'text', 'Carlos Mendonça', v_client_id, v_tenant_id, now() - interval '7 days'),
    (v_c1, 'Perfeito! Sexta às 14h. Vou preparar uma apresentação personalizada.', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '2 hours'),

    -- Conv 2 - Fernanda
    (v_c2, 'Olá! Estou avaliando CRMs. O uPixel tem integração WhatsApp?', 'inbound', 'text', 'Fernanda Rocha', v_client_id, v_tenant_id, now() - interval '5 days'),
    (v_c2, 'Oi Fernanda! Sim, nativa via Evolution API. Posso te enviar uma proposta?', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '5 days' + interval '30 minutes'),
    (v_c2, 'Por favor! E tem automações?', 'inbound', 'text', 'Fernanda Rocha', v_client_id, v_tenant_id, now() - interval '4 days'),
    (v_c2, 'Sim! Automações por gatilho e IA. A proposta está no seu e-mail.', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '5 hours'),

    -- Conv 5 - Ricardo
    (v_c5, 'Bom dia Ricardo! Soube que querem centralizar o WhatsApp das 3 farmácias.', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '3 days'),
    (v_c5, 'Oi! Sim. Posso te retornar à tarde?', 'inbound', 'text', 'Ricardo Alves', v_client_id, v_tenant_id, now() - interval '3 days' + interval '2 hours'),
    (v_c5, 'Claro! Vou enviar o material por enquanto.', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '3 days' + interval '2 hours' + interval '5 minutes'),
    (v_c5, 'Olá Ricardo! Tudo bem? Passando para confirmar se recebeu o material.', 'outbound', 'text', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '30 minutes');

  -- ── 6. Tarefas ──────────────────────────────────────────────
  INSERT INTO public.tasks
    (title, description, due_date, status, lead_id, assigned_to, client_id, tenant_id, created_at)
  VALUES
    ('Reunião com Carlos Mendonça',
     'Apresentação do uPixel para equipe da Alpha Construtora.',
     (now() + interval '2 days')::date::text, 'pending', v_l1, v_user_id, v_client_id, v_tenant_id, now()),
    ('Enviar contrato ajustado - ImobPrime',
     'Ajustar cláusula de integração com portais imobiliários.',
     now()::date::text, 'pending', v_l5, v_user_id, v_client_id, v_tenant_id, now()),
    ('Follow-up Fernanda - TechSolutions',
     'Verificar se recebeu a proposta.',
     (now() + interval '1 day')::date::text, 'pending', v_l2, v_user_id, v_client_id, v_tenant_id, now()),
    ('Ligar para Ricardo - Farmácia Saúde+',
     'Retornar contato após envio de material.',
     now()::date::text, 'pending', v_l3, v_user_id, v_client_id, v_tenant_id, now()),
    ('Agendar demo - GovTech',
     'Eduardo pediu demo técnica com equipe de TI.',
     (now() + interval '3 days')::date::text, 'pending', v_l11, v_user_id, v_client_id, v_tenant_id, now()),
    ('Onboarding LogiExpress',
     'Agendar chamada de onboarding com Thiago.',
     (now() + interval '1 day')::date::text, 'pending', v_l9, v_user_id, v_client_id, v_tenant_id, now()),
    ('Enviar proposta - EducaMais',
     'Amanda aguarda proposta do plano Growth.',
     (now() - interval '1 day')::date::text, 'completed', v_l6, v_user_id, v_client_id, v_tenant_id, now() - interval '2 days'),
    ('Qualificação - AgroMarcas',
     'Primeiro contato com Marcos.',
     (now() + interval '1 day')::date::text, 'pending', v_l7, v_user_id, v_client_id, v_tenant_id, now()),
    ('Análise de perda - Varejo DA',
     'Documentar motivo da perda.',
     (now() - interval '14 days')::date::text, 'completed', v_l10, v_user_id, v_client_id, v_tenant_id, now() - interval '15 days');

  -- ── 7. Timeline events ──────────────────────────────────────
  INSERT INTO public.timeline_events
    (lead_id, type, content, user_name, client_id, tenant_id, created_at)
  VALUES
    (v_l1, 'status_change', 'Lead movido para "Em Negociação"', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '2 days'),
    (v_l1, 'note', 'Carlos confirmou interesse no plano Enterprise. Budget aprovado.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '3 days'),
    (v_l1, 'meeting', 'Call de descoberta realizado. 45 min. Tom positivo.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '5 days'),
    (v_l5, 'status_change', 'Lead movido para "Em Negociação"', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '5 days'),
    (v_l5, 'note', 'Bruno quer integração com ZAP Imóveis e Viva Real.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '8 days'),
    (v_l9, 'status_change', 'Lead movido para "Fechado Ganho" 🎉', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '3 days'),
    (v_l9, 'note', 'Contrato de R$ 95.000/ano assinado.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '4 days'),
    (v_l9, 'meeting', 'Demo técnica realizada com equipe de TI.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '10 days'),
    (v_l10, 'status_change', 'Lead movido para "Fechado Perdido"', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '15 days'),
    (v_l10, 'note', 'Perdido por preço. Concorrente 40% mais barato.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '15 days'),
    (v_l11, 'note', 'Processo de licitação aberto.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '20 days'),
    (v_l11, 'meeting', 'Reunião inicial com equipe de compras.', 'Demo uPixel', v_client_id, v_tenant_id, now() - interval '25 days');

  -- ── 8. Automações ───────────────────────────────────────────
  INSERT INTO public.automations
    (name, status, trigger_type, nodes, edges, client_id, tenant_id, created_at)
  VALUES
    ('Boas-vindas ao novo lead', 'active', 'lead_created',
     '[{"id":"1","type":"trigger","label":"Novo lead criado"},{"id":"2","type":"action","label":"Enviar WhatsApp boas-vindas"}]'::jsonb,
     '[{"from":"1","to":"2"}]'::jsonb,
     v_client_id, v_tenant_id, now()),
    ('Follow-up 3 dias sem resposta', 'active', 'no_reply',
     '[{"id":"1","type":"trigger","label":"Sem resposta há 3 dias"},{"id":"2","type":"action","label":"Enviar mensagem follow-up"},{"id":"3","type":"action","label":"Notificar vendedor"}]'::jsonb,
     '[{"from":"1","to":"2"},{"from":"2","to":"3"}]'::jsonb,
     v_client_id, v_tenant_id, now()),
    ('Notificação de proposta aberta', 'inactive', 'proposal_viewed',
     '[{"id":"1","type":"trigger","label":"Proposta visualizada"},{"id":"2","type":"action","label":"Notificar vendedor"}]'::jsonb,
     '[{"from":"1","to":"2"}]'::jsonb,
     v_client_id, v_tenant_id, now());

  -- ── 9. Automation rules (gatilhos por coluna) ───────────────
  INSERT INTO public.automation_rules
    (name, active, pipeline_id, column_id, trigger, actions, exceptions, client_id, tenant_id)
  VALUES
    ('Boas-vindas em Novo Lead', true, v_pipeline_id, v_col_novo,
     '{"type":"on_enter_column"}'::jsonb,
     '[{"type":"send_whatsapp","template":"Olá {{nome}}, recebemos seu contato! Em breve um consultor entrará em contato."}]'::jsonb,
     '[]'::jsonb,
     v_client_id, v_tenant_id),
    ('Task automática em Proposta', true, v_pipeline_id, v_col_proposta,
     '{"type":"on_enter_column"}'::jsonb,
     '[{"type":"create_task","title":"Follow-up proposta - {{nome}}","due_in_days":3,"priority":"high"}]'::jsonb,
     '[]'::jsonb,
     v_client_id, v_tenant_id),
    ('Parabéns em Fechado Ganho', true, v_pipeline_id, v_col_ganho,
     '{"type":"on_enter_column"}'::jsonb,
     '[{"type":"send_whatsapp","template":"Parabéns {{nome}}! Seja bem-vindo. Equipe de onboarding entrará em contato em até 24h."},{"type":"notify_team","message":"🎉 Novo cliente fechado: {{nome}} ({{empresa}}) - R$ {{valor}}"}]'::jsonb,
     '[]'::jsonb,
     v_client_id, v_tenant_id);

  RAISE NOTICE '✓ Dados demo criados para ola.upixel.app';
  RAISE NOTICE 'Login: ola@upixel.app / Demo@2026!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Pipeline ID: %', v_pipeline_id;

END;
$$;

-- Verificação final
SELECT
  'pipelines' AS tabela, count(*) FROM public.pipelines WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'pipeline_columns', count(*) FROM public.pipeline_columns WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'leads', count(*) FROM public.leads WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'conversations', count(*) FROM public.conversations WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'messages', count(*) FROM public.messages WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'tasks', count(*) FROM public.tasks WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'timeline_events', count(*) FROM public.timeline_events WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'automations', count(*) FROM public.automations WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa'
UNION ALL
SELECT 'automation_rules', count(*) FROM public.automation_rules WHERE tenant_id = '3544da7e-5714-4206-a4a6-f223917919fa';
