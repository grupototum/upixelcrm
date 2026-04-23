-- ================================================================
-- IMPORT completo: dados migrados do projeto Lovable
-- Ordem: pipelines -> pipeline_columns -> leads -> conversations ->
-- messages -> tasks -> timeline_events -> integrations -> automations
-- -> automation_rules
--
-- Tudo idempotente: ON CONFLICT DO NOTHING
--
-- ATENCAO: Tokens OAuth (Google, WhatsApp) foram REDATADOS.
-- Apos o import, reconfigurar as integracoes no projeto novo.
-- ================================================================

-- pipelines (5 rows)
INSERT INTO public.pipelines (id, client_id, name, tenant_id, created_at) VALUES
('b0333d84-85fd-43de-b661-538657a7850f','demo1','Vendas B2B',null,'2026-03-30T15:59:29.456945+00:00'),
('1b786236-64ea-4694-83c9-a6030a665857','demo1','Inbound Marketing',null,'2026-03-30T15:59:29.456945+00:00'),
('6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','c1','teste',null,'2026-03-30T17:22:45.025168+00:00'),
('2a95eb3c-287c-42d9-bd4a-f76db46b1fe2','69154877-6805-4eb6-8e20-a535f663b827','Atendimento e Triagem',null,'2026-04-22T12:16:45.672895+00:00'),
('42dde8b5-6c88-45cf-b219-d1b1bc9409db','c1','tgeste2',null,'2026-04-22T13:20:37.313729+00:00')
ON CONFLICT (id) DO NOTHING;

-- pipeline_columns (26 rows)
INSERT INTO public.pipeline_columns (id, client_id, pipeline_id, name, color, "order", tenant_id, created_at) VALUES
('e2f6a4ae-77af-4619-85f7-42c90709f785','c1','p1','Novos Leads','#3b82f6',0,null,'2026-03-24T22:55:08.357535+00:00'),
('5f522adc-7463-4988-9988-42f46eac107e','c1','p1','Qualificação','#f59e0b',1,null,'2026-03-24T22:55:08.357535+00:00'),
('54763df3-609b-4bab-8600-b25935936c04','c1','p1','Proposta','#8b5cf6',2,null,'2026-03-24T22:55:08.357535+00:00'),
('6730958f-03c8-4114-abd4-68a3625db5a9','c1','p1','Negociação','#ec4899',3,null,'2026-03-24T22:55:08.357535+00:00'),
('fd72cb85-d80c-4783-8d3c-7d00efd239ab','c1','p1','Fechamento','#22c55e',4,null,'2026-03-24T22:55:08.357535+00:00'),
('939cff95-1182-46e6-8800-c5b5cb6c1188','demo1','b0333d84-85fd-43de-b661-538657a7850f','Novos Leads','#3b82f6',0,null,'2026-03-30T15:59:51.726251+00:00'),
('43b80e7a-5bb1-4031-8f7e-7cfcea0929f2','demo1','b0333d84-85fd-43de-b661-538657a7850f','Qualificação','#f59e0b',1,null,'2026-03-30T15:59:51.726251+00:00'),
('36d169ca-b4ae-4b91-95c6-64edac378fa1','demo1','b0333d84-85fd-43de-b661-538657a7850f','Proposta Enviada','#8b5cf6',2,null,'2026-03-30T15:59:51.726251+00:00'),
('91886867-236d-43f7-b9ab-1635b256d36c','demo1','b0333d84-85fd-43de-b661-538657a7850f','Negociação','#ec4899',3,null,'2026-03-30T15:59:51.726251+00:00'),
('22178f97-ee02-495c-8c7f-8047cca02065','demo1','b0333d84-85fd-43de-b661-538657a7850f','Fechamento','#22c55e',4,null,'2026-03-30T15:59:51.726251+00:00'),
('103869d4-8665-4a8c-93d7-21e20fd6fe4f','demo1','1b786236-64ea-4694-83c9-a6030a665857','Visitantes','#06b6d4',0,null,'2026-03-30T15:59:51.726251+00:00'),
('1fbd46b4-2943-4780-a111-b4970496ea32','demo1','1b786236-64ea-4694-83c9-a6030a665857','MQL','#f97316',1,null,'2026-03-30T15:59:51.726251+00:00'),
('61ef2ad8-d4d0-49d6-984b-8fa2fe260c2a','demo1','1b786236-64ea-4694-83c9-a6030a665857','SQL','#10b981',2,null,'2026-03-30T15:59:51.726251+00:00'),
('817119b3-8a83-4be1-92a9-c14f9676c05b','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','Novos Leads','#3b82f6',0,null,'2026-03-30T17:22:46.073+00:00'),
('39784f4d-d95c-4fe2-8ffb-869adeee4f3f','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','Qualificação','#f59e0b',1,null,'2026-03-30T17:22:46.073+00:00'),
('6126869d-f450-4de0-b9c8-cfaf9e7dcb21','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','Fechamento','#22c55e',2,null,'2026-03-30T17:22:46.073+00:00'),
('e9428be9-4de4-4433-91d3-d341259cdc0d','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','tesdte','#3b82f6',0,null,'2026-03-30T17:22:52.227329+00:00'),
('1e762213-b5e6-4e8f-a367-9b613e7ee78f','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','teste2','#3b82f6',1,null,'2026-03-30T17:23:02.843568+00:00'),
('41a2fc8a-b2e2-4ffb-a9bd-3c8eecbfe20a','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','teste3','#3b82f6',2,null,'2026-03-30T17:23:07.594393+00:00'),
('8bbbff50-451a-4c7f-a339-68690c4ceaac','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','teste 4','#3b82f6',3,null,'2026-03-30T17:23:12.5922+00:00'),
('b217a535-4ce4-491a-9586-ca6f3bfca537','69154877-6805-4eb6-8e20-a535f663b827','2a95eb3c-287c-42d9-bd4a-f76db46b1fe2','Novos Leads','#3b82f6',0,null,'2026-04-22T12:16:45.866502+00:00'),
('71e5dcbc-8a86-4d03-82f7-8cd718313731','69154877-6805-4eb6-8e20-a535f663b827','2a95eb3c-287c-42d9-bd4a-f76db46b1fe2','Qualificação','#f59e0b',1,null,'2026-04-22T12:16:45.866502+00:00'),
('05f86424-85da-45ff-83fa-3943f4ffcb05','69154877-6805-4eb6-8e20-a535f663b827','2a95eb3c-287c-42d9-bd4a-f76db46b1fe2','Fechamento','#22c55e',2,null,'2026-04-22T12:16:45.866502+00:00'),
('1045460d-81d3-4b16-8267-dda07266021e','c1','42dde8b5-6c88-45cf-b219-d1b1bc9409db','Novos Leads','#3b82f6',0,null,'2026-04-22T13:20:37.811949+00:00'),
('e2b65f35-51bb-4589-8732-cb0dbe23158f','c1','42dde8b5-6c88-45cf-b219-d1b1bc9409db','Qualificação','#f59e0b',1,null,'2026-04-22T13:20:37.811949+00:00'),
('a4cd6897-69e2-4125-8ffb-14fe7fad913b','c1','42dde8b5-6c88-45cf-b219-d1b1bc9409db','Fechamento','#22c55e',2,null,'2026-04-22T13:20:37.811949+00:00')
ON CONFLICT (id) DO NOTHING;

-- leads (25 rows)
INSERT INTO public.leads (id, client_id, column_id, name, email, phone, company, position, city, origin, value, tags, notes, category, responsible_id, tenant_id, created_at, updated_at) VALUES
('756a7d0e-29d3-4199-b901-661284696d68','c1','e9428be9-4de4-4433-91d3-d341259cdc0d','Israel Lemos',null,'553391294114',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto','certinhop']::text[],'','collaborator',null,null,'2026-03-31T15:30:31.752651+00:00','2026-04-06T14:47:55.013319+00:00'),
('a0ea054b-7596-4ab3-998a-356eaf0586a4','c1','e2f6a4ae-77af-4619-85f7-42c90709f785','Monise Oliveira',null,'5524998227093',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto']::text[],null,'partner',null,null,'2026-04-01T18:15:40.763777+00:00','2026-04-06T14:48:00.712314+00:00'),
('05b57228-6a4d-4acc-9c23-c0d0cff43957','c1','e2f6a4ae-77af-4619-85f7-42c90709f785','Larissa portes',null,'553384211709',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto','Parceiro']::text[],null,'partner',null,null,'2026-04-01T20:09:51.049173+00:00','2026-04-06T14:57:22.456894+00:00'),
('b2c19c1c-437e-4cc4-96bd-158143ace780','c1','e9428be9-4de4-4433-91d3-d341259cdc0d','.',null,null,null,null,null,'inbox',null,ARRAY['auto-criado','certinhop']::text[],null,'collaborator',null,null,'2026-03-31T15:07:20.130774+00:00','2026-04-06T14:57:28.213189+00:00'),
('386deae7-1cdf-4794-a38f-d93971da28bf','c1','e2f6a4ae-77af-4619-85f7-42c90709f785','Mylena Marzochi',null,'553391809052',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto']::text[],null,'collaborator',null,null,'2026-04-01T21:03:19.081189+00:00','2026-04-06T14:57:34.706873+00:00'),
('0e2465e7-bb77-4561-a280-232d7151f95e','c1','e2f6a4ae-77af-4619-85f7-42c90709f785','Matheus Felipe',null,'553398229545',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto']::text[],null,'collaborator',null,null,'2026-03-31T21:28:48.961204+00:00','2026-04-20T14:42:54.337965+00:00'),
('623933ad-6e72-481e-bbe1-8a1243872049','c1','54763df3-609b-4bab-8600-b25935936c04','Carlos Teste',null,null,'TechCorp',null,null,'Manual',null,ARRAY[]::text[],null,'lead',null,null,'2026-03-24T22:59:08.931601+00:00','2026-03-30T12:40:39.577177+00:00'),
('310f0ccb-4234-47d2-80a3-bb94da2b4e12','c1','5f522adc-7463-4988-9988-42f46eac107e','Maria Silva',null,null,'Acme Corp',null,null,'Manual',null,ARRAY['teste']::text[],null,'lead',null,null,'2026-03-27T12:20:22.128757+00:00','2026-03-30T14:51:17.721756+00:00'),
('e37a947a-178d-4f0c-b7d3-f6bff0250e9b','demo1','939cff95-1182-46e6-8800-c5b5cb6c1188','Carlos Eduardo Mendes','carlos@techsolutions.com.br','+55 11 99887-1234','Tech Solutions LTDA','CEO','São Paulo','Meta Ads',45000,ARRAY['hot','enterprise']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('c3e15ed7-c111-478c-ad1b-eb5d68ece0e9','demo1','939cff95-1182-46e6-8800-c5b5cb6c1188','Fernanda Rodrigues','fernanda@agenciacriativa.com','+55 21 98765-4321','Agência Criativa','Diretora de Marketing','Rio de Janeiro','Google Ads',18000,ARRAY['warm']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('20e7c375-5e6c-4f64-8e18-f67619c533e1','demo1','43b80e7a-5bb1-4031-8f7e-7cfcea0929f2','Roberto Silva','roberto@construtoraalpha.com','+55 11 97654-3210','Construtora Alpha','Gerente Comercial','São Paulo','Indicação',75000,ARRAY['hot']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('dd9126ff-8736-4284-8b61-0e78c43b5113','demo1','43b80e7a-5bb1-4031-8f7e-7cfcea0929f2','Ana Beatriz Costa','ana@edutech.io','+55 31 96543-2109','EduTech Brasil','COO','Belo Horizonte','Evento',32000,ARRAY['enterprise']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('b98b762e-c38d-4eb5-93b2-8a043e1a0bcc','demo1','36d169ca-b4ae-4b91-95c6-64edac378fa1','Marcos Vinícius Almeida','marcos@logisticapro.com','+55 41 95432-1098','Logística Pro','Diretor de Operações','Curitiba','Outbound',120000,ARRAY['hot','enterprise']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('4b13747a-1357-4f75-a1a4-be6a6e5bd76a','demo1','36d169ca-b4ae-4b91-95c6-64edac378fa1','Juliana Ferreira','juliana@startup.io','+55 11 94321-0987','StartupFlow','Founder','São Paulo','Website',22000,ARRAY['warm']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('df4cea9e-7fda-4045-90c5-36e5c9c5544e','demo1','91886867-236d-43f7-b9ab-1635b256d36c','Paulo Henrique Santos','paulo@industriabr.com','+55 21 93210-9876','Indústria BR','Diretor','Rio de Janeiro','Meta Ads',95000,ARRAY['hot']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('47808d1e-ca7c-49b3-8737-d1c6271e4148','demo1','91886867-236d-43f7-b9ab-1635b256d36c','Camila Oliveira','camila@designstudio.com','+55 51 92109-8765','Design Studio','Sócia','Porto Alegre','Instagram',15000,ARRAY['warm']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('9017c300-d542-416c-a47e-2ebe9110a554','demo1','22178f97-ee02-495c-8c7f-8047cca02065','Ricardo Montenegro','ricardo@fintechbr.com','+55 11 91098-7654','FinTech BR','CTO','São Paulo','Google Ads',180000,ARRAY['won','enterprise']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('6095e80d-5989-48f8-b987-ab88faabbf6c','demo1','22178f97-ee02-495c-8c7f-8047cca02065','Patrícia Lima','patricia@saasmaster.com','+55 48 90987-6543','SaaS Master','VP de Vendas','Florianópolis','Evento',55000,ARRAY['won']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('04500dc8-13b3-4068-87ba-89e11b5263d5','demo1','103869d4-8665-4a8c-93d7-21e20fd6fe4f','Lucas Alencar','lucas@mediagroup.com','+55 11 98877-1122','Media Group','Head de Growth','São Paulo','Website',8000,ARRAY['cold']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('f515a43b-b707-4624-aa07-8fc0897afb17','demo1','1fbd46b4-2943-4780-a111-b4970496ea32','Isabela Rocha','isabela@healthtech.com','+55 21 97766-2233','HealthTech','CMO','Rio de Janeiro','Meta Ads',28000,ARRAY['warm']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('135204fd-8aaa-478c-aef1-f12f367c7dae','demo1','61ef2ad8-d4d0-49d6-984b-8fa2fe260c2a','Thiago Nascimento','thiago@consultoriaprime.com','+55 31 96655-3344','Consultoria Prime','Sócio','Belo Horizonte','Indicação',42000,ARRAY['hot']::text[],null,'lead',null,null,'2026-03-30T16:00:16.163726+00:00','2026-03-30T16:00:16.163726+00:00'),
('42b67b95-ae8f-46fa-baa1-1af8a60c7206','c1','e9428be9-4de4-4433-91d3-d341259cdc0d','teste','email@email.com','1111111111',null,null,null,'Manual',null,ARRAY['deu certo','certinhop']::text[],null,'lead',null,null,'2026-03-30T18:19:10.051563+00:00','2026-03-30T18:40:24.55132+00:00'),
('886714b8-c714-4cc2-9543-560bdb731d78','c1','e2f6a4ae-77af-4619-85f7-42c90709f785','552120181195',null,'552120181195',null,null,null,'whatsapp',null,ARRAY['whatsapp-auto']::text[],null,'lead',null,null,'2026-03-31T16:14:25.082175+00:00','2026-03-31T16:14:25.082175+00:00'),
('017c8b85-c6c0-487a-b9e6-b80373b2dfa1','c1',null,'teste',null,null,null,null,null,'Manual',null,ARRAY[]::text[],null,'lead',null,null,'2026-03-30T18:52:52.007936+00:00','2026-03-31T18:07:55.661971+00:00'),
('1e3e19fc-f722-41ea-95af-a8a2fea62768','c1','817119b3-8a83-4be1-92a9-c14f9676c05b','Matheus Felipe',null,null,null,null,null,'inbox',null,ARRAY['auto-criado','deu certo 2','certinhop']::text[],null,'lead',null,null,'2026-03-31T18:16:48.580159+00:00','2026-04-01T13:38:03.110925+00:00')
ON CONFLICT (id) DO NOTHING;

-- conversations (111 rows)
INSERT INTO public.conversations (id, client_id, lead_id, channel, status, last_message, last_message_at, unread_count, metadata, tenant_id, created_at, updated_at) VALUES
('69d6eb0e-0e8d-4813-ab10-25991888cdd4','c1','886714b8-c714-4cc2-9543-560bdb731d78','whatsapp','open','[Mensagem não suportada]','2026-03-31T16:14:25.214+00:00',0,'{"lead_name": "552120181195", "phone": "552120181195"}'::jsonb,null,'2026-03-31T16:14:25.452089+00:00','2026-03-31T16:14:25.452089+00:00'),
('8efc230b-06e3-4248-81f8-5c45dd89f8a1','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:17.964+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.054315+00:00','2026-04-06T14:54:51.248+00:00'),
('0d461939-dad9-4771-b544-36fffc9e1cb5','c1',null,'whatsapp','open','Ficou ótimo! Obrigada. 😘','2026-03-31T14:57:25.857+00:00',1,'{"lead_name": "Mylena Marzochi", "phone": "120363420992740174"}'::jsonb,null,'2026-03-31T14:23:42.499793+00:00','2026-03-31T14:23:42.499793+00:00'),
('212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','1e3e19fc-f722-41ea-95af-a8a2fea62768','whatsapp','open','[Mensagem não suportada]','2026-03-31T18:21:13.028+00:00',0,'{"lead_name": "lana", "phone": "553391294114-1635332413"}'::jsonb,null,'2026-03-31T14:33:34.427144+00:00','2026-03-31T18:21:13.028+00:00'),
('508f1c35-25bb-4db0-acd0-249c168f241f','c1','b2c19c1c-437e-4cc4-96bd-158143ace780','whatsapp','open','teste','2026-04-20T14:18:19.153+00:00',0,'{"lead_name": ".", "phone": "553196391432"}'::jsonb,null,'2026-03-31T14:28:39.842481+00:00','2026-04-06T18:22:33.939+00:00'),
('9860ea50-074f-4bc9-8088-c6e295070711','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:12:05.466+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:12:05.557374+00:00','2026-04-06T14:54:51.248+00:00'),
('4d017930-a4ac-4ee0-836c-84102b5d3143','c1','0e2465e7-bb77-4561-a280-232d7151f95e','whatsapp','open','Msm tela','2026-04-22T12:21:51.032+00:00',0,'{"lead_name": "Matheus Felipe", "phone": "553398229545", "priority": "medium"}'::jsonb,null,'2026-03-31T21:28:49.522492+00:00','2026-04-22T12:21:51.032+00:00'),
('12a396d4-4ee0-417f-9aa0-8718bc552053','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:17.252+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:17.353551+00:00','2026-04-06T14:54:51.248+00:00'),
('19d2bed5-4f93-423c-864b-e6fc8f334ba1','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:18.164+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.246647+00:00','2026-04-06T14:54:51.248+00:00'),
('1f863e51-fd22-4fc1-9f04-344037dc5503','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','teste','2026-03-31T17:32:45.305+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-03-31T17:32:44.826878+00:00','2026-04-06T14:54:51.248+00:00'),
('447603b7-f131-4246-ab96-21263bd89ba8','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:17.702+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:17.784882+00:00','2026-04-06T14:54:51.248+00:00'),
('5aaf1821-aa90-42e2-af0b-8f80e7b509d6','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','vc ja fez ?','2026-04-01T18:58:57.431+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T18:58:57.848874+00:00','2026-04-06T14:54:51.248+00:00'),
('5be438ed-0bb1-4cd9-ad6e-211a0f47f04d','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','502365','2026-04-06T18:27:47.356+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:27:47.59161+00:00','2026-04-06T18:27:47.59161+00:00'),
('607c3eb9-958d-43d3-a62e-1ca49c993e92','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','@totum_agents_bot','2026-03-31T21:27:18.055+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.137757+00:00','2026-04-06T14:54:51.248+00:00'),
('646a8823-9306-4212-a573-66a48b6060ed','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','https://totum-app-harmony.lovable.app
isso aqui ta lindo demais !!','2026-03-31T21:27:15.687+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:15.771625+00:00','2026-04-06T14:54:51.248+00:00'),
('82eb0459-6720-42fc-a608-449e30cf5719','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:17.463+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:17.545511+00:00','2026-04-06T14:54:51.248+00:00'),
('a7344530-3739-4059-af3f-434c1190d787','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','só entrar no telegram, e chamar ela','2026-03-31T21:27:17.98+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.064365+00:00','2026-04-06T14:54:51.248+00:00'),
('895fd7e6-d7ae-4c43-aa5c-e5bb019dd2bb','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','📷 Imagem','2026-04-20T17:26:10.065+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-20T17:26:10.255938+00:00','2026-04-20T17:26:10.255938+00:00'),
('baca14a5-3d57-4f3e-bfe5-626508d328fd','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','🎵 Áudio','2026-04-22T12:12:36.892+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-22T12:12:37.265605+00:00','2026-04-22T12:12:37.265605+00:00'),
('c011a1b3-ff9d-4ae8-b75a-8313798f09c9','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','No WhatsApp','2026-04-01T21:59:05.752+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T21:59:05.92033+00:00','2026-04-06T14:54:51.248+00:00'),
('d355b290-34af-484a-a3fd-c31bbeac3ab0','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Outra coisa, ele tá privado no github ?','2026-04-02T13:12:18.828+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:12:18.90802+00:00','2026-04-06T14:54:51.248+00:00'),
('06766009-818a-42bf-bd61-44789dbaface','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Vou apresentar a vocês a nossa primeira funcionária . Kimi Totum','2026-03-31T21:27:18.569+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.652501+00:00','2026-04-06T14:54:51.248+00:00'),
('06bdd69d-24ac-48ab-883a-04b28cc25140','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','perai','2026-04-06T18:27:19.605+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:27:19.693065+00:00','2026-04-06T18:27:19.693065+00:00'),
('09ddb7c1-07c4-4ddf-b4ec-63e7c5b04ea8','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:18.792+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.877934+00:00','2026-04-06T14:54:51.248+00:00'),
('0f952d36-fc73-4191-aff8-55bf9b0884d6','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','tudo','2026-04-01T13:00:50.868+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:00:51.316087+00:00','2026-04-06T14:54:51.248+00:00'),
('519cec7c-cadb-427f-846d-488d5aba2bac','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Bom dia Vini ! Tudo joia ?','2026-04-01T11:00:05.53+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T11:00:05.613479+00:00','2026-04-06T14:54:51.248+00:00'),
('d7375ec4-e3ba-42c9-b9fb-da61292a56cf','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T15:20:47.685+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:48.031792+00:00','2026-04-06T14:54:51.248+00:00'),
('da7ee7f3-52ec-4ac9-9a40-674c4906a26d','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:15:09.392+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:15:09.667967+00:00','2026-04-06T14:54:51.248+00:00'),
('e08a29ff-effe-40ed-9d4b-45d36073710f','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','Agora vai chegar no Wpp','2026-04-06T18:28:38.465+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:28:38.14698+00:00','2026-04-06T18:28:38.14698+00:00'),
('e0ee6924-b361-487b-ab41-30d5da264556','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','testando','2026-04-06T18:18:10.697+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:18:10.431726+00:00','2026-04-06T18:18:10.431726+00:00'),
('e420d1c6-b678-46a5-85b6-5d3515a7f239','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','Mentira','2026-04-06T18:26:37.477+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:26:37.030353+00:00','2026-04-06T18:26:37.030353+00:00'),
('e4be9320-caa6-4cb8-9f19-3822d00acaef','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','nao cheou ainda.. chengando eu mando','2026-04-06T18:30:12.478+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:30:12.567141+00:00','2026-04-06T18:30:12.567141+00:00'),
('eb426241-e50f-4ae4-b5b3-e14935bdb92b','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','💰 CÁLCULO DE CUSTOS - WhatsApp Cloud API
📊 PREÇOS OFICIAIS META (2025) - Brasil
Por Tipo de Mensagem:
Table
Tipo	Custo USD	Custo R$*	Quando é Cobrado
Marketing	$0,0625	R$ 0,34	Sempre cobrado
Utility (Transacional)	$0,0068	R$ 0,04	Fora da janela de 24h
Authentication	$0,0315	R$ 0,17	Sempre cobrado
Service (Suporte)	GRÁTIS	GRÁTIS	Sempre gratuito
*Câmbio: R$ 5,50
🎯 CENÁRIOS DE CUSTO MENSAL
📌 Cenário 1: Pequena Empresa (Iniciante)
500 mensagens de marketing/mês
1.000 mensagens de service (grátis)
200 mensagens utility
Cálculo:
plain
Copy
Marketing: 500 × R$ 0,34 = R$ 170,00
Utility: 200 × R$ 0,04 = R$ 8,00
Service: 1.000 × R$ 0 = R$ 0

TOTAL: R$ 178,00/mês
📌 Cenário 2: Média Empresa (Totum atual)
2.000 mensagens de marketing/mês
5.000 mensagens de service (grátis)
1.000 mensagens utility
500 mensagens authentication
Cálculo:
plain
Copy
Marketing: 2.000 × R$ 0,34 = R$ 680,00
Utility: 1.000 × R$ 0,04 = R$ 40,00
Auth: 500 × R$ 0,17 = R$ 85,00
Service: 5.000 × R$ 0 = R$ 0

TOTAL: R$ 805,00/mês
📌 Cenário 3: Grande Volume (Escalando)
10.000 mensagens de marketing/mês
20.000 mensagens de service (grátis)
5.000 mensagens utility
2.000 mensagens authentication
Cálculo:
plain
Copy
Marketing: 10.000 × R$ 0,34 = R$ 3.400,00
Utility: 5.000 × R$ 0,04 = R$ 200,00
Auth: 2.000 × R$ 0,17 = R$ 340,00
Service: 20.000 × R$ 0 = R$ 0

TOTAL: R$ 3.940,00/mês
DESCONTO POR VOLUME (a partir de 250k msgs): -5% a -25%
🏢 CUSTOS ADICIONAIS
1️⃣ Evolution API (Hospedagem)
Table
Opção	Custo	Observação
Self-hosted (VPS)	~R$ 50-150/mês	Você gerencia
Cloud Evolution	~R$ 200-500/mês	Pronto para usar
2️⃣ BSP (Business Solution Provider) - Opcional
Table
Provedor	Taxa sobre Meta	Custo Estimado
Direto na Meta	0%	Só paga Meta
ManyChat	+10-35%	Ex: R805→R 1.086
360dialog	+5-15%	Ex: R805→R 926
Zenvia	+15-30%	Ex: R805→R 1.046
WATI	+10-25%	Ex: R805→R 1.006
💡 Recomendação: Use direto na Meta ou Evolution API self-hosted para economizar!
📈 CUSTO TOTAL ESTIMADO (TOTUM)
Opção 1: Econômica (Recomendada)
plain
Copy
Meta Cloud API direto:    R$ 805,00/mês
VPS Evolution API:        R$ 100,00/mês
Desenvolvimento:          R$ 0,00 (você faz)

TOTAL: R$ 905,00/mês
Opção 2: Prática (Com BSP)
plain
Copy
Meta Cloud API:           R$ 805,00/mês
Taxa BSP (15%):           R$ 120,75/mês
Plataforma BSP:           R$ 300,00/mês

TOTAL: R$ 1.225,75/mês
💡 DICAS PARA ECONOMIZAR
✅ Gratuito:
Conversas Service → Sempre gratuitas (cliente inicia)
Utility na janela de 24h → Grátis após cliente responder
Anúncios "Clique para WhatsApp" → Janela gratuita de 72h
✅ Estratégias:
Use mensagens de service para suporte (grátis!)
Envie utility apenas quando necessário
Evite marketing excessivo (mais caro)
Configure automação para responder rápido (janela 24h)
🎯 RESUMO PARA A TOTUM
Table
Volume Mensal	Custo Meta	+ VPS	+ BSP (15%)
Pequeno (500 msgs)	R$ 178	R$ 278	R$ 485
Médio (3.500 msgs)	R$ 805	R$ 905	R$ 1.226
Grande (17.000 msgs)	R$ 3.940	R$ 4.040	R$ 4.831
🚀 RECOMENDAÇÃO FINAL
Para a Totum (hoje):
Custo estimado: R$ 900 - 1.200/mês
Setup ideal:
✅ WhatsApp Cloud API direto na Meta (sem taxa BSP)
✅ Evolution API self-hosted no VPS Stark
✅ Integrar com os agentes de atendimento
✅ Usar mensagens de service sempre que possível
ROI esperado: Automatizar atendimento reduz custo de equipe em 40-60%, pagando o investimento em 2-3 meses.','2026-04-01T13:47:43.98+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:47:44.220653+00:00','2026-04-06T14:54:51.248+00:00'),
('eda657e5-3aed-4b03-91a0-39ab8ce647b1','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Já tinha feito ?','2026-04-02T13:11:54.67+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:11:54.789127+00:00','2026-04-06T14:54:51.248+00:00'),
('ef4e25e9-1435-43f5-ae2d-05053f17c35f','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Disparos Pré-pagos ( onde vamos ganhar $ nisso )','2026-04-01T14:14:20.175+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:14:20.292701+00:00','2026-04-06T14:54:51.248+00:00'),
('f577de51-1caa-41fb-82df-8b2ad2626640','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','pode seguir','2026-04-01T19:38:35.523+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T19:38:35.714815+00:00','2026-04-06T14:54:51.248+00:00'),
('f74e233b-e809-4921-9f2c-5f7ad36e20e9','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','https://meet.google.com/xja-abvt-cme','2026-04-01T13:03:31.528+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:03:31.820492+00:00','2026-04-06T14:54:51.248+00:00'),
('fb32fd67-3462-4311-a38a-508ebc64cc2b','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','fazendo isso… vai ser complicado demais pro seu lado ?','2026-04-01T15:20:59.922+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:21:00.006088+00:00','2026-04-06T14:54:51.248+00:00'),
('fed9f35e-4c15-4472-aee4-b46f139da14c','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','Vc consegue me passar o codigo do facebook que chegou no email do comercial totum??','2026-04-06T18:21:52.217+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:21:51.795842+00:00','2026-04-06T18:21:51.795842+00:00'),
('2f55e95a-c8f7-4316-8b2b-e00a91450aca','c1','a0ea054b-7596-4ab3-998a-356eaf0586a4','whatsapp','resolved','Mandei mensagem ao Matheus, peço que passe o recado que preciso falar com ele por favor','2026-04-02T13:15:33.047+00:00',0,'{"lead_name": "Monise Oliveira", "phone": "5524998227093", "priority": "medium"}'::jsonb,null,'2026-04-01T18:15:41.161647+00:00','2026-04-06T14:55:00.702+00:00'),
('043b28c6-fceb-430b-a529-2b9f9fa4a736','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','ok','2026-04-06T18:30:05.106+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:30:05.386927+00:00','2026-04-06T18:30:05.386927+00:00'),
('245b832c-c681-49c8-8ebe-abb178328de9','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','[Áudio]','2026-03-31T16:18:33.655+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114"}'::jsonb,null,'2026-03-31T16:18:33.906299+00:00','2026-04-06T14:54:51.248+00:00'),
('4b319413-64ad-48ca-af80-42d428ccb92e','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','ponto 3 em diante na janela de disparo….','2026-04-01T14:10:39.353+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:10:39.571552+00:00','2026-04-06T14:54:51.248+00:00'),
('4f534382-9997-42c6-841e-399c10d724f7','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:13:28.07+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:13:28.167797+00:00','2026-04-06T14:54:51.248+00:00'),
('54245a8e-394e-4302-9976-772a844931b7','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','[Mensagem não suportada]','2026-03-31T21:26:52.601+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:26:52.749132+00:00','2026-04-06T14:54:51.248+00:00'),
('665104c5-d7c9-46c5-8add-a4cc3642526a','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:17:41.296+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:17:41.422281+00:00','2026-04-06T14:54:51.248+00:00'),
('6bfded1d-5605-4b3a-bd3c-8f92efe802c5','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:21:39.007+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:21:39.250617+00:00','2026-04-06T14:54:51.248+00:00'),
('6cca14f7-ebdc-4a27-b85a-6383ee8f0f76','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Caraca !!!','2026-03-31T15:30:32.257+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114"}'::jsonb,null,'2026-03-31T15:30:33.115042+00:00','2026-04-06T14:54:51.248+00:00'),
('907a470f-27a0-4bb8-a350-5508156dcac2','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Pode mandar','2026-04-01T21:58:09.618+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T21:58:09.724717+00:00','2026-04-06T14:54:51.248+00:00'),
('941cf16c-071d-4aab-81b8-7248d07826cc','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','vamos nos reunir ?','2026-04-01T13:00:52.586+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:00:52.666381+00:00','2026-04-06T14:54:51.248+00:00'),
('9c0ec987-7d34-42e6-a83f-bc3022e204a0','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','blza','2026-04-01T15:32:43.206+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:32:43.660017+00:00','2026-04-06T14:54:51.248+00:00'),
('a4b7364e-0c68-4a56-8fa6-c12a03d7a503','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','ok','2026-04-06T18:22:42.741+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:22:42.836719+00:00','2026-04-06T18:22:42.836719+00:00'),
('af34f0b1-ea65-47fe-af77-98f5b1038f7c','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:18.406+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:18.488052+00:00','2026-04-06T14:54:51.248+00:00'),
('ce58ee4a-1bc3-4d6c-9e0b-ec58d5f5d46f','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Poxa !! Tá bom demais','2026-03-31T16:38:46.107+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114"}'::jsonb,null,'2026-03-31T16:38:46.215587+00:00','2026-04-06T14:54:51.248+00:00'),
('d0ee8853-5b86-4c56-8653-3f7413224451','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:10:59.313+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:10:59.470857+00:00','2026-04-06T14:54:51.248+00:00'),
('e45d6007-e7ad-4073-a524-dc831a7137c2','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Parabéns !!!!','2026-03-31T15:30:33.797+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114"}'::jsonb,null,'2026-03-31T15:30:35.673599+00:00','2026-04-06T14:54:51.248+00:00'),
('ea7647a1-dc05-4f8f-9707-c299b210d162','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','precisamos alinhar tudo','2026-04-01T13:00:59.186+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:00:59.577469+00:00','2026-04-06T14:54:51.248+00:00'),
('f4c88bc4-2bde-4076-a177-4dc2a46c1482','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','ok','2026-04-02T11:53:01.78+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:53:01.975665+00:00','2026-04-06T14:54:51.248+00:00'),
('0ea6298c-8ed3-462c-9e0f-6abb2a41903d','c1','386deae7-1cdf-4794-a38f-d93971da28bf','whatsapp','open','Consigo sim, qual o número que elas estão utilizando agora?','2026-04-01T21:03:29.142+00:00',0,'{"lead_name": "Mylena Marzochi", "phone": "553391809052", "priority": "medium"}'::jsonb,null,'2026-04-01T21:03:19.489149+00:00','2026-04-01T21:03:29.142+00:00'),
('27b379b0-b58c-493f-bdf5-eb37632712e2','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','pwei','2026-04-06T18:22:43.449+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:22:43.54167+00:00','2026-04-06T18:22:43.54167+00:00'),
('43e99339-925e-4aae-bc2b-be355b82b75c','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📋 CHECKLIST DE IMPLEMENTAÇÃO
[ ] Configurar Evolution API no Stark
[ ] Conectar WhatsApp Cloud API direto na Meta
[ ] Criar templates de Utility (gratuito na janela)
[ ] Configurar webhooks para tracking de custos
[ ] Definir limites por cliente (evitar surpresas)
[ ] Dashboard de custos por cliente','2026-04-01T14:08:51.763+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:08:52.012875+00:00','2026-04-06T14:54:51.248+00:00'),
('4cd98f6e-e60c-4bf9-a225-f8a5e0ed5683','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','E no administrativo','2026-04-06T18:26:55.92+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:26:55.686908+00:00','2026-04-06T18:26:55.686908+00:00'),
('603fac77-d5c1-40ac-936c-5b3bc54678f8','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','talvez o dominio principal do upixel esteja com problemas, dai vc usa o https://upixelcrm.lovable.app','2026-04-02T12:34:56.975+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T12:34:57.082736+00:00','2026-04-06T14:54:51.248+00:00'),
('782fc2f5-2ea3-49d0-bf0f-b13c9434e76b','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Foi levantado um ponto aqui','2026-04-01T15:20:20.212+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:20.675382+00:00','2026-04-06T14:54:51.248+00:00'),
('914c3f89-78bb-4cb7-9f5a-107c8e771188','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','estou fazendo de um jeito que ele vai alterar automaticamente','2026-04-01T19:38:45.521+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T19:38:45.631129+00:00','2026-04-06T14:54:51.248+00:00'),
('93cfbb62-9709-45a5-b946-363629aae7c3','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','vê o que vc acha…','2026-04-01T15:21:44.31+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:21:44.510583+00:00','2026-04-06T14:54:51.248+00:00'),
('a54830ab-feb0-4482-8bac-31b864a97f48','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','e ai mano','2026-04-02T11:17:48.897+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:17:49.144091+00:00','2026-04-06T14:54:51.248+00:00'),
('b11fd2b9-5fc5-44df-bf18-94e3ab870d9a','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','to trabalhando no vps agora','2026-04-01T18:59:00.864+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T18:59:00.944379+00:00','2026-04-06T14:54:51.248+00:00'),
('77b4a6e6-e38b-456f-9a9f-a0bb13cd4e79','c1','05b57228-6a4d-4acc-9c23-c0d0cff43957','whatsapp','resolved','Somente o número do final 8510 que está sendo restringido,tem algum motivo específico? Sabe me dizer?','2026-04-02T14:05:27.65+00:00',0,'{"lead_name": "Larissa portes", "phone": "553384211709", "priority": "medium"}'::jsonb,null,'2026-04-01T20:09:51.501457+00:00','2026-04-06T14:51:46.083+00:00'),
('b3206f64-7001-4513-930b-df8e54482775','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-03-31T21:27:17.3+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-03-31T21:27:17.395524+00:00','2026-04-06T14:54:51.248+00:00'),
('1f305daf-bcbc-41b9-9222-e44c7e4912b4','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','conseguimos terminar hoje pra testar ?','2026-04-02T11:18:01.262+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:18:01.362495+00:00','2026-04-06T14:54:51.248+00:00'),
('20ac5c57-53e8-4e32-aa8e-fb24a679b796','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','Bom dia Vini ! Tudo joia ?','2026-04-22T11:00:09.757+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-22T11:00:09.983319+00:00','2026-04-22T11:00:09.983319+00:00'),
('3b2fe05d-9b4b-41f6-becb-a0c37da877e7','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','tnc','2026-04-01T13:32:21.027+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:32:21.106651+00:00','2026-04-06T14:54:51.248+00:00'),
('4da2e7bf-e148-462e-84ba-cc85714b97a6','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Vini','2026-04-02T13:07:03.974+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:07:04.103141+00:00','2026-04-06T14:54:51.248+00:00'),
('602135bf-6ece-445d-9e84-47c1af505e03','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Para tudo e olha isso','2026-04-02T13:07:06.778+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:07:06.85573+00:00','2026-04-06T14:54:51.248+00:00'),
('9398d3ca-c7c9-4c94-968d-74e6912893a3','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','teste','2026-04-01T13:32:13.794+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-01T13:32:13.523909+00:00','2026-04-06T14:54:51.248+00:00'),
('9b4b30cf-d84c-4a57-b42e-28638012941e','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','411264','2026-04-06T18:34:51.43+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:34:51.611826+00:00','2026-04-06T18:34:51.611826+00:00'),
('a09025a0-665a-469f-8b95-08c6a814c836','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','https://vt.tiktok.com/ZSHMnYfWm/','2026-04-02T13:07:08.822+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:07:08.898436+00:00','2026-04-06T14:54:51.248+00:00'),
('da001689-d44a-4e2a-bf3d-c05c098b5e49','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','não chegou codigo no gmail comercialgrupototum@gmail.com','2026-04-06T18:24:34.435+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:24:34.715663+00:00','2026-04-06T18:24:34.715663+00:00'),
('f7ad26d4-2a84-450c-b0d8-4e3091651033','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T13:48:19.313+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:48:19.393079+00:00','2026-04-06T14:54:51.248+00:00'),
('193fc0f4-13f4-4ae3-9921-cc4d843cb326','c1','b2c19c1c-437e-4cc4-96bd-158143ace780','instagram','open',null,'2026-04-06T18:54:12.814642+00:00',0,'{"email": "", "lead_name": ".", "phone": "553196391432"}'::jsonb,null,'2026-04-06T18:54:12.814642+00:00','2026-04-06T18:54:12.814642+00:00'),
('19072f23-c3d4-40b4-9645-beb55b770d5a','c1','b2c19c1c-437e-4cc4-96bd-158143ace780','webchat','open','teste','2026-04-06T18:54:38.199+00:00',0,'{"email": "", "lead_name": ".", "phone": "553196391432"}'::jsonb,null,'2026-04-06T18:54:23.166894+00:00','2026-04-06T18:54:23.166894+00:00'),
('019bd946-061e-488f-84b5-64e97ea74df7','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','como estamos ?','2026-04-02T11:17:50.838+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:17:50.921327+00:00','2026-04-06T14:54:51.248+00:00'),
('0a7e037d-ff26-4016-af72-623adf07c403','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Ok','2026-04-02T13:13:59.99+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:14:00.096213+00:00','2026-04-06T14:54:51.248+00:00'),
('0fd9686e-a579-4eab-ae06-2da95e3e6f51','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','To conversando por ele inclusive','2026-04-06T18:23:28.32+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:23:27.88062+00:00','2026-04-06T18:23:27.88062+00:00'),
('38869224-cc15-46b4-88e7-272378531f44','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Não chegou','2026-04-01T21:58:58.37+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T21:58:58.578433+00:00','2026-04-06T14:54:51.248+00:00'),
('42b0ba9f-9ca2-4721-aa66-b1a88016466c','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','mano','2026-04-01T15:20:06.269+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:06.520536+00:00','2026-04-06T14:54:51.248+00:00'),
('45f5dd77-01de-408f-b24d-aa5abaf637e5','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','vamos seguindo','2026-04-01T15:32:46.093+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:32:46.195599+00:00','2026-04-06T14:54:51.248+00:00'),
('5503d4a2-2531-4c99-a596-4bfb6226de10','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','API ?','2026-04-01T18:16:48.037+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T18:16:48.155566+00:00','2026-04-06T14:54:51.248+00:00'),
('5a30947b-b2a8-4583-8ba5-5acad23e77e2','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T13:49:33.429+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:49:33.535643+00:00','2026-04-06T14:54:51.248+00:00'),
('5fd484f8-cc8d-4a38-8d6b-d94dd6aff874','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:09:51.512+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:09:51.667793+00:00','2026-04-06T14:54:51.248+00:00'),
('692f6ce5-08f3-4b6b-9ba9-0494a6a5217a','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','grupototumadm@gmail.com
o email do facebook','2026-04-01T22:01:43.624+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T22:01:43.791672+00:00','2026-04-06T14:54:51.248+00:00'),
('7fb0b9f9-9ff5-45a4-b59d-103b9f75e2e0','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T22:00:27.206+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T22:00:27.485528+00:00','2026-04-06T14:54:51.248+00:00'),
('8c00db23-269f-48ab-ba66-3a4932fb7f43','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T15:20:47.937+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:48.033045+00:00','2026-04-06T14:54:51.248+00:00'),
('9332c341-8599-4cdb-a22a-55a71fa48dfa','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','⚠️ Você não tem créditos suficientes!

Responder agora custa 1 crédito (R$ 0,50)

[COMPRAR CRÉDITOS]  [VER PLANOS]

💡 Dica: Responder dentro de 24h é GRÁTIS!','2026-04-01T14:16:07.151+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:16:07.395772+00:00','2026-04-06T14:54:51.248+00:00'),
('0d53a3ef-45db-49df-9765-107064e93d95','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎯 MELHOR MODELO: CRÉDITOS PRÉ-PAGOS
Como funciona:
Cliente compra pacote de créditos antecipado
Cada mensagem fora da janela = 1 crédito
Acabou os créditos? Para de enviar até comprar mais
Por que é melhor:
✅ Você recebe ANTES de pagar a Meta
✅ Sem risco de inadimplência
✅ Margem garantida
✅ Cliente controla o gasto','2026-04-01T14:14:30.177+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:14:30.457868+00:00','2026-04-06T14:54:51.248+00:00'),
('16c29ed6-d2b8-43f2-a23e-8f9520de9559','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','de substituir o Docker','2026-04-01T15:20:50.712+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:50.786754+00:00','2026-04-06T14:54:51.248+00:00'),
('243cc021-cf8f-460b-9373-8527da8a98ee','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','Bom dia Vini ! Tudo joia ?','2026-04-02T11:00:06.353+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:00:06.74268+00:00','2026-04-06T14:54:51.248+00:00'),
('27083db3-cd34-409e-85c4-3c9eb99e92ea','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','[Mensagem não suportada]','2026-04-01T15:20:47.402+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T15:20:47.562233+00:00','2026-04-06T14:54:51.248+00:00'),
('65a7dbb2-adf9-49a3-839a-f699ee36b4f2','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','CLIENTE envia mensagem → Abre janela gratuita de 24h
    ↓
UPIXEL responde dentro de 24h
    ↓
TIPO: Service → GRÁTIS ✨

CUSTO: R$ 0,00','2026-04-01T14:02:57.126+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:02:57.320477+00:00','2026-04-06T14:54:51.248+00:00'),
('6f0e38b5-604d-403b-a6fc-b705b6c67086','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','nao entendi','2026-04-01T18:16:49.472+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T18:16:49.591826+00:00','2026-04-06T14:54:51.248+00:00'),
('7f2fc59c-94f2-4284-ab08-1793da14f518','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','📷 Imagem','2026-04-01T13:48:04.213+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T13:48:04.324079+00:00','2026-04-06T14:54:51.248+00:00'),
('b3391cc6-4f44-495a-8a82-f116c987d646','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','ah ta','2026-04-06T18:27:17.337+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-06T18:27:17.423401+00:00','2026-04-06T18:27:17.423401+00:00'),
('c09ebee5-ef9e-4b94-8b2e-69674f689f9f','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:39:23.944+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:39:24.179862+00:00','2026-04-06T14:54:51.248+00:00'),
('c60ee087-6135-40f5-a86d-55777ff31764','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','open','Inclusive o whatsapp lite ja voltou a funcionar','2026-04-06T18:23:05.963+00:00',0,'{"phone": "553391294114"}'::jsonb,null,'2026-04-06T18:23:05.694514+00:00','2026-04-06T18:23:05.694514+00:00'),
('d2f3d341-52ad-417d-9408-dca12dfc37b3','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','526405','2026-04-01T22:06:22.238+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T22:06:22.476136+00:00','2026-04-06T14:54:51.248+00:00'),
('e9d7e2fd-f7e7-4f28-a0d1-93419814b1ab','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','deu certo ?','2026-04-01T22:17:40.634+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T22:17:40.85744+00:00','2026-04-06T14:54:51.248+00:00'),
('eadc651d-17a7-4a0e-855a-dddbf4c9e90a','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:33:18.644+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:33:18.815924+00:00','2026-04-06T14:54:51.248+00:00'),
('f034132c-45c6-4e7f-90e6-46e355e16b12','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','colocar no dashboard a possibilidade de simulação','2026-04-01T14:09:39.868+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-01T14:09:40.433976+00:00','2026-04-06T14:54:51.248+00:00'),
('fbb106e9-9438-4d14-8638-f77f17c39553','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','🎵 Áudio','2026-04-02T13:27:08.826+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T13:27:09.080487+00:00','2026-04-06T14:54:51.248+00:00'),
('fdfb9657-7463-4893-968f-ea1520f10e9a','c1','756a7d0e-29d3-4199-b901-661284696d68','whatsapp','resolved','vc viu o lance da Derma','2026-04-02T11:53:05.078+00:00',0,'{"lead_name": "Israel Lemos", "phone": "553391294114", "priority": "medium"}'::jsonb,null,'2026-04-02T11:53:05.174133+00:00','2026-04-06T14:54:51.248+00:00')
ON CONFLICT (id) DO NOTHING;

-- messages (184 rows)
INSERT INTO public.messages (id, conversation_id, client_id, content, direction, type, sender_name, metadata, tenant_id, created_at) VALUES
('5f4fc22d-1270-41bf-9d6b-ce0f1c3ce6ec','0d461939-dad9-4771-b544-36fffc9e1cb5','c1','Depois aceitem a solicitação por favor 😉','inbound','image','Mylena Marzochi','{"whatsapp_message_id": "3AF07657E654D5029E47"}'::jsonb,null,'2026-03-31T14:23:42.713518+00:00'),
('dd652423-fb57-479e-96c7-185936e9b5c8','0d461939-dad9-4771-b544-36fffc9e1cb5','c1','Ficou muuito bacana','inbound','text','Mylena Marzochi','{"whatsapp_message_id": "3A88CA77064A4F9A2C09"}'::jsonb,null,'2026-03-31T14:24:05.780498+00:00'),
('19a9cf16-e3a8-4caa-aa2c-d032c1dc0f1e','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Teste','inbound','text','.','{"whatsapp_message_id": "AC534332E94670436DAF985092D40116"}'::jsonb,null,'2026-03-31T14:28:40.207481+00:00'),
('70360827-36b4-40e6-8c9c-2529b9e3a804','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Testando','outbound','text','Você','{}'::jsonb,null,'2026-03-31T14:28:55.644145+00:00'),
('a1912745-e23c-4a51-95e5-b9a7ac8e5c30','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Deu certo','inbound','text','.','{"whatsapp_message_id": "AC8316F516D2E62D4A451832E3B4BADA"}'::jsonb,null,'2026-03-31T14:29:08.438794+00:00'),
('3de0aa15-1de9-437b-b21d-0dbce5b00529','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','[Mensagem não suportada]','inbound','text','lana','{"whatsapp_message_id": "3EB0B5C2EBCA7265B35D04"}'::jsonb,null,'2026-03-31T14:33:35.052797+00:00'),
('87eebe7c-0826-4599-8137-82ebdde85459','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Teste novo','inbound','text','.','{"whatsapp_message_id": "AC67027E1E093A9BC438F5794C3E8E87"}'::jsonb,null,'2026-03-31T14:43:56.701214+00:00'),
('88dedbb5-0900-48a0-901b-6e43264afba7','0d461939-dad9-4771-b544-36fffc9e1cb5','c1','Pode deixar, obrigada!','inbound','text','Gabriela Mourão','{"whatsapp_message_id": "3A3D1C1B04BD83097EEF"}'::jsonb,null,'2026-03-31T14:56:19.314449+00:00'),
('badcc15b-6659-43aa-9e25-c43b6818590e','0d461939-dad9-4771-b544-36fffc9e1cb5','c1','Ficou ótimo! Obrigada. 😘','inbound','text','Daniela Armond','{"whatsapp_message_id": "3A7CA5AEDB73477A9530"}'::jsonb,null,'2026-03-31T14:57:26.497501+00:00'),
('19a6c3ad-b9a6-4a75-876f-04296d7daf5a','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Testando','inbound','text','.','{"whatsapp_message_id": "AC33F221BC738F399ED8DBC8B8EE7C37"}'::jsonb,null,'2026-03-31T15:07:19.125393+00:00'),
('ee87990a-dc84-4244-b40a-3ca372392e72','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Opa','inbound','text','.','{"whatsapp_message_id": "AC1D7090981DE67D82F96ACC3D8D588C"}'::jsonb,null,'2026-03-31T15:19:13.346172+00:00'),
('2db0122a-f405-476a-b12e-435833c1a492','508f1c35-25bb-4db0-acd0-249c168f241f','c1','Teste','inbound','text','.','{"whatsapp_message_id": "AC2D323C8C0377B0349F3DF174098012"}'::jsonb,null,'2026-03-31T15:19:37.56521+00:00'),
('e96555d8-36e9-4205-9330-3a0ce40f7492','6cca14f7-ebdc-4a27-b85a-6383ee8f0f76','c1','Caraca !!!','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AD913FC568A9B5BB7D5"}'::jsonb,null,'2026-03-31T15:30:33.643406+00:00'),
('67f8de64-0eff-44e4-8393-4cb278d94314','e45d6007-e7ad-4073-a524-dc831a7137c2','c1','Parabéns !!!!','inbound','text','Israel Lemos','{"whatsapp_message_id": "3A82BC581D1D9749CEBF"}'::jsonb,null,'2026-03-31T15:30:36.202288+00:00'),
('97543101-6ca6-4290-80f0-9cbc6ca56e30','69d6eb0e-0e8d-4813-ab10-25991888cdd4','c1','[Mensagem não suportada]','inbound','text','552120181195','{"whatsapp_message_id": "CAAD4D24F27E511D774E"}'::jsonb,null,'2026-03-31T16:14:25.754746+00:00'),
('2b8d11c9-2890-46aa-9df5-3e726b344de4','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','[Mensagem não suportada]','inbound','text','lana','{"whatsapp_message_id": "3EB0C14818B1D18AB97333"}'::jsonb,null,'2026-03-31T16:24:24.472724+00:00'),
('4e33ca60-1c42-4a82-a581-f76b74d611e1','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','31-03-totum-criativo-01.mp4','inbound','file','lana','{"whatsapp_message_id": "3EB0E6D25DEE93EA266586"}'::jsonb,null,'2026-03-31T16:24:29.231468+00:00'),
('06f105c1-bf85-480b-8ef0-f8137d21edb9','ce58ee4a-1bc3-4d6c-9e0b-ec58d5f5d46f','c1','Poxa !! Tá bom demais','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AFEBE13D8D61F175F35"}'::jsonb,null,'2026-03-31T16:38:46.457554+00:00'),
('e1f644fe-29d4-40cd-bf3b-fd2990d58c39','1f863e51-fd22-4fc1-9f04-344037dc5503','c1','teste','outbound','text','Você','{}'::jsonb,null,'2026-03-31T17:32:45.1865+00:00'),
('dbb560a6-57aa-41cf-bf7d-9eadaba888d5','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','[Mensagem não suportada]','inbound','text','lana','{"whatsapp_message_id": "3EB0B658B620F86B5C0FA6"}'::jsonb,null,'2026-03-31T17:56:36.984978+00:00'),
('fb806ed2-9db7-47fb-8a38-4cd34543dd9f','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','31-03-totum-criativo-02.mp4','inbound','file','lana','{"whatsapp_message_id": "3EB0CD93E7E09A22171C3F"}'::jsonb,null,'2026-03-31T17:56:40.299037+00:00'),
('2e1ecda8-41ce-4139-bd29-f4203f33bf05','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','Caraca ficaram bons msm','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A604DE594C15D878EB3"}'::jsonb,null,'2026-03-31T18:15:48.509413+00:00'),
('ac24f45f-f969-4e73-8ae7-6a0e9d4f50b9','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','Nunca duvidei de vc Matheus, vc arrasou','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3AB2304DA5551487F127"}'::jsonb,null,'2026-03-31T18:16:21.685825+00:00'),
('8e08baeb-acf3-448c-bd5b-1e07065b84e2','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','[Mensagem não suportada]','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A61C5547027F1023C76"}'::jsonb,null,'2026-03-31T18:16:47.697075+00:00'),
('84e339d4-f552-469f-b6a6-cb98c6d25d8e','245b832c-c681-49c8-8ebe-abb178328de9','c1','[Áudio]','inbound','audio','Israel Lemos','{"transcript": "Esta é uma transcrição simulada do áudio. O áudio parece falar sobre o novo projeto de CRM.", "whatsapp_message_id": "3A68B07ECA054F454B5C"}'::jsonb,null,'2026-03-31T16:18:34.25643+00:00'),
('6f8fef73-3bc0-427f-8b1d-6aaa9b4d1cfb','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','Kkkkkkkkk','inbound','text','Mylena Marzochi','{"whatsapp_message_id": "3EB0F3DF5900F101F8950C"}'::jsonb,null,'2026-03-31T18:20:58.814993+00:00'),
('c0aa296f-ec6a-4f70-86c2-d9781eb4ac9c','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','Parabéns Matheus ficou muito bom','inbound','text','Mylena Marzochi','{"whatsapp_message_id": "3EB0FC91B8CC58A8D3703B"}'::jsonb,null,'2026-03-31T18:21:03.446167+00:00'),
('bc347695-724a-41ad-a65e-f12ac618cc57','212f504f-aa1c-4a67-b94c-7994cf6b10f5','c1','[Mensagem não suportada]','inbound','text','lana','{"whatsapp_message_id": "3EB07CF3281FAA7CD55893"}'::jsonb,null,'2026-03-31T18:21:13.334769+00:00'),
('53b1e240-9096-4a3e-b4bc-99695e203623','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://mmg.whatsapp.net/v/t62.7117-24/664054840_1562557625661879_7124311582765528775_n.enc?ccb=11-4&oh=01_Q5Aa4AEKQsUhl74Da5ZV2TGNF0xsW8dk2_h3cSdrmTH2xaULAw&oe=69F38221&_nc_sid=5e03e0&mms3=true','inbound','audio','.','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/664054840_1562557625661879_7124311582765528775_n.enc?ccb=11-4&oh=01_Q5Aa4AEKQsUhl74Da5ZV2TGNF0xsW8dk2_h3cSdrmTH2xaULAw&oe=69F38221&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 2, "whatsapp_message_id": "ACC4DC63B8AA1B31521FE522F42F7D08"}'::jsonb,null,'2026-03-31T18:25:26.081036+00:00'),
('99990069-8b3c-4193-abea-4115aa5e526f','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://mmg.whatsapp.net/v/t62.7117-24/613363555_1471913214321229_1956741415673280499_n.enc?ccb=11-4&oh=01_Q5Aa4AEyjMDoG1ZRzt8Dsj5p4cptBOqBrv9w1eXcc3ah1O9xzQ&oe=69F37AC8&_nc_sid=5e03e0&mms3=true','inbound','audio','.','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/613363555_1471913214321229_1956741415673280499_n.enc?ccb=11-4&oh=01_Q5Aa4AEyjMDoG1ZRzt8Dsj5p4cptBOqBrv9w1eXcc3ah1O9xzQ&oe=69F37AC8&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 4, "transcript": "Esta é uma transcrição simulada do áudio. O áudio parece falar sobre o novo projeto de CRM.", "whatsapp_message_id": "ACFA238A2399BAD2B3BE01316AA900BC"}'::jsonb,null,'2026-03-31T18:45:49.738725+00:00'),
('ef6ccc9f-8dac-4965-a0ac-bbcaba747880','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://mmg.whatsapp.net/v/t62.7118-24/550330864_1969025767041689_4428166465570982736_n.enc?ccb=11-4&oh=01_Q5Aa4AETg5v7r1TYuvdG6gwoXou0aa6Mc_JYTtf6Rls59Lqx8w&oe=69F38F00&_nc_sid=5e03e0&mms3=true','inbound','image','.','{"caption": "", "media_url": "https://mmg.whatsapp.net/v/t62.7118-24/550330864_1969025767041689_4428166465570982736_n.enc?ccb=11-4&oh=01_Q5Aa4AETg5v7r1TYuvdG6gwoXou0aa6Mc_JYTtf6Rls59Lqx8w&oe=69F38F00&_nc_sid=5e03e0&mms3=true", "mimetype": "image/jpeg", "whatsapp_message_id": "ACEF0B3D29B715F403C2D47E3603BB41"}'::jsonb,null,'2026-03-31T18:46:40.290352+00:00'),
('2494b52f-1b99-41f6-8b96-1799697e9379','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://mmg.whatsapp.net/v/t62.7118-24/607698982_2472133463217682_813429010822147369_n.enc?ccb=11-4&oh=01_Q5Aa4AH9zaZMA6S-0Fzg_9hct2JawYy-zEeK72e9ACUUcTUyyQ&oe=69F38B4B&_nc_sid=5e03e0&mms3=true','inbound','image','.','{"caption": "", "media_url": "https://mmg.whatsapp.net/v/t62.7118-24/607698982_2472133463217682_813429010822147369_n.enc?ccb=11-4&oh=01_Q5Aa4AH9zaZMA6S-0Fzg_9hct2JawYy-zEeK72e9ACUUcTUyyQ&oe=69F38B4B&_nc_sid=5e03e0&mms3=true", "mimetype": "image/jpeg", "whatsapp_message_id": "AC4C02972FBA604F9599B3F645318D32"}'::jsonb,null,'2026-03-31T19:09:53.54439+00:00'),
('70e7613c-917b-42ac-b5c3-b87aa27c4c78','f74e233b-e809-4921-9f2c-5f7ad36e20e9','c1','https://meet.google.com/xja-abvt-cme','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B9188C5BEB54224F8B4"}'::jsonb,null,'2026-04-01T13:03:31.999818+00:00'),
('fd687212-618a-422b-9b50-3a0825be6678','3b2fe05d-9b4b-41f6-becb-a0c37da877e7','c1','tnc','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B8D6E9D490AFD23DE51"}'::jsonb,null,'2026-04-01T13:32:21.262253+00:00'),
('cca891f1-3bbe-4fb7-b0d4-8c3d29b85a23','eb426241-e50f-4ae4-b5b3-e14935bdb92b','c1','💰 CÁLCULO DE CUSTOS - WhatsApp Cloud API
📊 PREÇOS OFICIAIS META (2025) - Brasil
Por Tipo de Mensagem:
Table
Tipo	Custo USD	Custo R$*	Quando é Cobrado
Marketing	$0,0625	R$ 0,34	Sempre cobrado
Utility (Transacional)	$0,0068	R$ 0,04	Fora da janela de 24h
Authentication	$0,0315	R$ 0,17	Sempre cobrado
Service (Suporte)	GRÁTIS	GRÁTIS	Sempre gratuito
*Câmbio: R$ 5,50
🎯 CENÁRIOS DE CUSTO MENSAL
📌 Cenário 1: Pequena Empresa (Iniciante)
500 mensagens de marketing/mês
1.000 mensagens de service (grátis)
200 mensagens utility
Cálculo:
plain
Copy
Marketing: 500 × R$ 0,34 = R$ 170,00
Utility: 200 × R$ 0,04 = R$ 8,00
Service: 1.000 × R$ 0 = R$ 0

TOTAL: R$ 178,00/mês
📌 Cenário 2: Média Empresa (Totum atual)
2.000 mensagens de marketing/mês
5.000 mensagens de service (grátis)
1.000 mensagens utility
500 mensagens authentication
Cálculo:
plain
Copy
Marketing: 2.000 × R$ 0,34 = R$ 680,00
Utility: 1.000 × R$ 0,04 = R$ 40,00
Auth: 500 × R$ 0,17 = R$ 85,00
Service: 5.000 × R$ 0 = R$ 0

TOTAL: R$ 805,00/mês
📌 Cenário 3: Grande Volume (Escalando)
10.000 mensagens de marketing/mês
20.000 mensagens de service (grátis)
5.000 mensagens utility
2.000 mensagens authentication
Cálculo:
plain
Copy
Marketing: 10.000 × R$ 0,34 = R$ 3.400,00
Utility: 5.000 × R$ 0,04 = R$ 200,00
Auth: 2.000 × R$ 0,17 = R$ 340,00
Service: 20.000 × R$ 0 = R$ 0

TOTAL: R$ 3.940,00/mês
DESCONTO POR VOLUME (a partir de 250k msgs): -5% a -25%
🏢 CUSTOS ADICIONAIS
1️⃣ Evolution API (Hospedagem)
Table
Opção	Custo	Observação
Self-hosted (VPS)	~R$ 50-150/mês	Você gerencia
Cloud Evolution	~R$ 200-500/mês	Pronto para usar
2️⃣ BSP (Business Solution Provider) - Opcional
Table
Provedor	Taxa sobre Meta	Custo Estimado
Direto na Meta	0%	Só paga Meta
ManyChat	+10-35%	Ex: R805→R 1.086
360dialog	+5-15%	Ex: R805→R 926
Zenvia	+15-30%	Ex: R805→R 1.046
WATI	+10-25%	Ex: R805→R 1.006
💡 Recomendação: Use direto na Meta ou Evolution API self-hosted para economizar!
📈 CUSTO TOTAL ESTIMADO (TOTUM)
Opção 1: Econômica (Recomendada)
plain
Copy
Meta Cloud API direto:    R$ 805,00/mês
VPS Evolution API:        R$ 100,00/mês
Desenvolvimento:          R$ 0,00 (você faz)

TOTAL: R$ 905,00/mês
Opção 2: Prática (Com BSP)
plain
Copy
Meta Cloud API:           R$ 805,00/mês
Taxa BSP (15%):           R$ 120,75/mês
Plataforma BSP:           R$ 300,00/mês

TOTAL: R$ 1.225,75/mês
💡 DICAS PARA ECONOMIZAR
✅ Gratuito:
Conversas Service → Sempre gratuitas (cliente inicia)
Utility na janela de 24h → Grátis após cliente responder
Anúncios "Clique para WhatsApp" → Janela gratuita de 72h
✅ Estratégias:
Use mensagens de service para suporte (grátis!)
Envie utility apenas quando necessário
Evite marketing excessivo (mais caro)
Configure automação para responder rápido (janela 24h)
🎯 RESUMO PARA A TOTUM
Table
Volume Mensal	Custo Meta	+ VPS	+ BSP (15%)
Pequeno (500 msgs)	R$ 178	R$ 278	R$ 485
Médio (3.500 msgs)	R$ 805	R$ 905	R$ 1.226
Grande (17.000 msgs)	R$ 3.940	R$ 4.040	R$ 4.831
🚀 RECOMENDAÇÃO FINAL
Para a Totum (hoje):
Custo estimado: R$ 900 - 1.200/mês
Setup ideal:
✅ WhatsApp Cloud API direto na Meta (sem taxa BSP)
✅ Evolution API self-hosted no VPS Stark
✅ Integrar com os agentes de atendimento
✅ Usar mensagens de service sempre que possível
ROI esperado: Automatizar atendimento reduz custo de equipe em 40-60%, pagando o investimento em 2-3 meses.','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BE2742BDB8FB88D7113"}'::jsonb,null,'2026-04-01T13:47:44.535311+00:00'),
('88b15d7a-0df1-46ca-a5e1-8b5fdedd65b3','9b4b30cf-d84c-4a57-b42e-28638012941e','c1','411264','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AB8B53D83FF87E31FEB"}'::jsonb,null,'2026-04-06T18:34:51.908106+00:00'),
('604dbeca-7e6b-4e46-959b-961dedc98503','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774984707961_4y7mnd.jpg','inbound','image','.','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774984707961_4y7mnd.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "ACFCBD008D2B115A32FE1531875C4DA9"}'::jsonb,null,'2026-03-31T19:18:29.433193+00:00'),
('b580ce39-669d-447f-9bc4-7a571d62cdaf','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774985328297_07bwc0.jpg','inbound','image','.','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774985328297_07bwc0.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "AC2218A485B64A7F3955C08CA7F15AB2"}'::jsonb,null,'2026-03-31T19:28:49.050756+00:00'),
('89f1c142-6479-40c2-aad6-1ec26704b200','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774984681300_l8afdd.ogg','inbound','audio','.','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774984681300_l8afdd.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 3, "transcript": "Esta é uma transcrição simulada do áudio. O áudio parece falar sobre o novo projeto de CRM.", "whatsapp_message_id": "AC89770071E8005AF5B90E112C3EC231"}'::jsonb,null,'2026-03-31T19:18:03.699591+00:00'),
('0dc27283-be7b-45ae-8a25-125dd505f2e0','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774987126093_dcg3za.jpg','inbound','image','.','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774987126093_dcg3za.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "AC4A66DFA7B546910B4A1A9922D1A5A5"}'::jsonb,null,'2026-03-31T19:58:47.974732+00:00'),
('53750e2f-56fb-4faa-add1-57afc358c605','54245a8e-394e-4302-9976-772a844931b7','c1','[Mensagem não suportada]','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B3BB37CB6C5E44F1ADF"}'::jsonb,null,'2026-03-31T21:26:52.923594+00:00'),
('0582fe8e-3c76-4996-9c8e-6ab0ed05e892','646a8823-9306-4212-a573-66a48b6060ed','c1','https://totum-app-harmony.lovable.app
isso aqui ta lindo demais !!','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B132E6BB21FD86D0FC4"}'::jsonb,null,'2026-03-31T21:27:16.187746+00:00'),
('1f4363ed-81d7-439e-b596-d3868e702eac','12a396d4-4ee0-417f-9aa0-8718bc552053','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436379_m9d33v.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436379_m9d33v.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B7F4A5C312AC2309FC0"}'::jsonb,null,'2026-03-31T21:27:17.532494+00:00'),
('edb4f83d-3d79-4eea-a419-8a29f11c73d7','b3206f64-7001-4513-930b-df8e54482775','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436493_up0ewv.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436493_up0ewv.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3BB86D6094D908819CBF"}'::jsonb,null,'2026-03-31T21:27:17.557894+00:00'),
('addef752-6f2d-4b04-aaf4-9d09819a31f9','82eb0459-6720-42fc-a608-449e30cf5719','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436655_q8htiz.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436655_q8htiz.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B32C912B13CD42A55D2"}'::jsonb,null,'2026-03-31T21:27:17.760734+00:00'),
('d9489b05-41dc-4349-b823-e94819a60774','447603b7-f131-4246-ab96-21263bd89ba8','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436807_876wfo.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436807_876wfo.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3BFB5643C481AA47376F"}'::jsonb,null,'2026-03-31T21:27:17.934246+00:00'),
('dbccf679-84e9-4437-87fc-b2c2ed5096b0','8efc230b-06e3-4248-81f8-5c45dd89f8a1','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437211_m7uvpq.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437211_m7uvpq.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B50AB664337FCCF9D3D"}'::jsonb,null,'2026-03-31T21:27:18.210478+00:00'),
('f0dbc802-b6d9-4931-8069-98cded6b69f8','a7344530-3739-4059-af3f-434c1190d787','c1','só entrar no telegram, e chamar ela','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B41664B5BA89F3D3B6C"}'::jsonb,null,'2026-03-31T21:27:18.216916+00:00'),
('2083a5fd-1d01-4be7-85a9-2dbf34ce8575','607c3eb9-958d-43d3-a62e-1ca49c993e92','c1','@totum_agents_bot','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B75BB6EEEAA55D783BD"}'::jsonb,null,'2026-03-31T21:27:18.302013+00:00'),
('8ee1276d-3e63-4958-91ae-e30c66cedfb5','19d2bed5-4f93-423c-864b-e6fc8f334ba1','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437281_xzozgz.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437281_xzozgz.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3BD3F4606EEA8AFC8411"}'::jsonb,null,'2026-03-31T21:27:18.406499+00:00'),
('1f88c13f-ffa9-4514-9609-2c8d83a78814','af34f0b1-ea65-47fe-af77-98f5b1038f7c','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437547_6xpkte.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437547_6xpkte.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B42FF3FE7CDBADCC3A0"}'::jsonb,null,'2026-03-31T21:27:18.638054+00:00'),
('d55ce527-2e1f-47dd-ada3-0c9d81101fd5','06766009-818a-42bf-bd61-44789dbaface','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437818_0aayhq.jpg','inbound','image','Israel Lemos','{"caption": "Vou apresentar a vocês a nossa primeira funcionária . Kimi Totum", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992437818_0aayhq.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B99C81A6444C0F3A71C"}'::jsonb,null,'2026-03-31T21:27:18.798737+00:00'),
('7eb4c39e-4f99-4802-ac39-c98cbc6addb5','09ddb7c1-07c4-4ddf-b4ec-63e7c5b04ea8','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436954_fvtjct.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1774992436954_fvtjct.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3BD27C54699B6F4B5D87"}'::jsonb,null,'2026-03-31T21:27:19.025935+00:00'),
('688f2def-97ed-4220-b568-2901b9bc2ce0','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Fala Vinny boa noite','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A3D5A0C53A368ACFE78"}'::jsonb,null,'2026-03-31T21:28:49.720699+00:00'),
('61ce0a3f-91dd-4d96-9519-c8cb6019b94e','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Nesse caso ela tá restringida, possivelmente só com o CRM','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3AC5E64F55C03A7C94BD"}'::jsonb,null,'2026-03-31T21:28:58.744209+00:00'),
('0995b945-55b1-4463-a63f-be01e4acabd3','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Número delas deve tá funcionando redondo, no telefone e no web','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3AD9239DEE8F4DE2DB51"}'::jsonb,null,'2026-03-31T21:29:12.045163+00:00'),
('b0679051-4be0-454f-9c4a-ccb9252259b9','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Só fechar e abrir','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A420CCB0255B65FB0C4"}'::jsonb,null,'2026-03-31T21:29:16.712001+00:00'),
('0b7785fd-0fc0-4805-ab9a-50b6f3a35ff2','519cec7c-cadb-427f-846d-488d5aba2bac','c1','Bom dia Vini ! Tudo joia ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "1A1396D310A1BA083D4D"}'::jsonb,null,'2026-04-01T11:00:05.798255+00:00'),
('432ba5a6-0b6b-4626-b87a-1f792b37fb73','0f952d36-fc73-4191-aff8-55bf9b0884d6','c1','tudo','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B5B0717B92004805AF8"}'::jsonb,null,'2026-04-01T13:00:51.566984+00:00'),
('98ffbaaf-4102-4c31-973e-f414291d92cc','941cf16c-071d-4aab-81b8-7248d07826cc','c1','vamos nos reunir ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BD383A4150E3189470D"}'::jsonb,null,'2026-04-01T13:00:52.813579+00:00'),
('5b254140-d2eb-4ff4-beb3-afef1d891384','ea7647a1-dc05-4f8f-9707-c299b210d162','c1','precisamos alinhar tudo','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B6AA6CF9AF86E19B496"}'::jsonb,null,'2026-04-01T13:00:59.728089+00:00'),
('72297d87-d077-4345-b862-51b5acd63322','9398d3ca-c7c9-4c94-968d-74e6912893a3','c1','teste','outbound','text','Você','{}'::jsonb,null,'2026-04-01T13:32:13.709386+00:00'),
('06d4c388-6eda-4026-b591-d87790b353ed','7f2fc59c-94f2-4284-ab08-1793da14f518','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051282470_nfeqdf.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051282470_nfeqdf.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B4E1C503E865D7FAE8F"}'::jsonb,null,'2026-04-01T13:48:04.568722+00:00'),
('ff21bc51-d725-450a-baf5-6630007ad572','f7ad26d4-2a84-450c-b0d8-4e3091651033','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051298671_2h3h88.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051298671_2h3h88.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B18F3969E0F47F84203"}'::jsonb,null,'2026-04-01T13:48:19.571646+00:00'),
('533a9093-7116-4390-9d30-2cbe628fc428','5a30947b-b2a8-4583-8ba5-5acad23e77e2','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051372088_lu8zil.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775051372088_lu8zil.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B75EB646C81B2877B1D"}'::jsonb,null,'2026-04-01T13:49:33.87437+00:00'),
('1ef5ae7b-2529-4e46-8e4b-f5d887094542','65a7dbb2-adf9-49a3-839a-f699ee36b4f2','c1','CLIENTE envia mensagem → Abre janela gratuita de 24h
    ↓
UPIXEL responde dentro de 24h
    ↓
TIPO: Service → GRÁTIS ✨

CUSTO: R$ 0,00','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BA50CCF139BB27A316B"}'::jsonb,null,'2026-04-01T14:02:57.637409+00:00'),
('1774a3b2-1c7b-4c72-9430-58c4a5623cad','43e99339-925e-4aae-bc2b-be355b82b75c','c1','📋 CHECKLIST DE IMPLEMENTAÇÃO
[ ] Configurar Evolution API no Stark
[ ] Conectar WhatsApp Cloud API direto na Meta
[ ] Criar templates de Utility (gratuito na janela)
[ ] Configurar webhooks para tracking de custos
[ ] Definir limites por cliente (evitar surpresas)
[ ] Dashboard de custos por cliente','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BC3498DDF322F4E4DF4"}'::jsonb,null,'2026-04-01T14:08:52.352666+00:00'),
('e1c0e9e0-23ec-4aad-a984-b2df9795cbf7','f034132c-45c6-4e7f-90e6-46e355e16b12','c1','colocar no dashboard a possibilidade de simulação','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B715DE3F5C8F63807BC"}'::jsonb,null,'2026-04-01T14:09:40.641073+00:00'),
('5dc59c7f-fe84-448d-96ec-d2fb9f8d3363','4b319413-64ad-48ca-af80-42d428ccb92e','c1','ponto 3 em diante na janela de disparo….','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B6C099F8AF781F4D3FD"}'::jsonb,null,'2026-04-01T14:10:39.799698+00:00'),
('917bcc14-954e-485f-890d-0aa111d8f375','ef4e25e9-1435-43f5-ae2d-05053f17c35f','c1','Disparos Pré-pagos ( onde vamos ganhar $ nisso )','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BA0715BBEAFAD377313"}'::jsonb,null,'2026-04-01T14:14:20.636737+00:00'),
('2e501c1f-9011-4399-9883-c725bcfe05c4','0d53a3ef-45db-49df-9765-107064e93d95','c1','🎯 MELHOR MODELO: CRÉDITOS PRÉ-PAGOS
Como funciona:
Cliente compra pacote de créditos antecipado
Cada mensagem fora da janela = 1 crédito
Acabou os créditos? Para de enviar até comprar mais
Por que é melhor:
✅ Você recebe ANTES de pagar a Meta
✅ Sem risco de inadimplência
✅ Margem garantida
✅ Cliente controla o gasto','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B54542B6FEB564AE180"}'::jsonb,null,'2026-04-01T14:14:30.840746+00:00'),
('e10d4497-0b5f-42c8-a3b0-28b9facaf246','9332c341-8599-4cdb-a22a-55a71fa48dfa','c1','⚠️ Você não tem créditos suficientes!

Responder agora custa 1 crédito (R$ 0,50)

[COMPRAR CRÉDITOS]  [VER PLANOS]

💡 Dica: Responder dentro de 24h é GRÁTIS!','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B28356D12EDE82DA8AF"}'::jsonb,null,'2026-04-01T14:16:07.621851+00:00'),
('4a0fa34c-a789-44ac-b142-c4f57468257a','42b0ba9f-9ca2-4721-aa66-b1a88016466c','c1','mano','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B371082B3B84DA53FAE"}'::jsonb,null,'2026-04-01T15:20:06.864973+00:00'),
('5e8c3b51-4c8e-490d-8432-bdc4ef1ea68a','782fc2f5-2ea3-49d0-bf0f-b13c9434e76b','c1','Foi levantado um ponto aqui','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B179DBD923A2B329924"}'::jsonb,null,'2026-04-01T15:20:21.286887+00:00'),
('8b96ff08-757f-4920-856a-f39dd75b6f22','27083db3-cd34-409e-85c4-3c9eb99e92ea','c1','[Mensagem não suportada]','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BBF4DFA8127A97E331E"}'::jsonb,null,'2026-04-01T15:20:47.795559+00:00'),
('9c84b743-0800-4344-b8f2-fcfc258a4ef6','d7375ec4-e3ba-42c9-b9fb-da61292a56cf','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775056846640_bhmd70.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775056846640_bhmd70.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3BDD3DE1B285800C9107"}'::jsonb,null,'2026-04-01T15:20:48.187839+00:00'),
('308c4c6a-a69b-466a-a32c-692c9aeb1c24','8c00db23-269f-48ab-ba66-3a4932fb7f43','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775056846967_dvm7za.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775056846967_dvm7za.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3B0830FB04E763FF7797"}'::jsonb,null,'2026-04-01T15:20:48.231244+00:00'),
('449554c0-59fb-4f8d-8a39-49c1866b68bf','16c29ed6-d2b8-43f2-a23e-8f9520de9559','c1','de substituir o Docker','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BEF713559F4157A0C0D"}'::jsonb,null,'2026-04-01T15:20:50.935063+00:00'),
('8271327d-6377-404f-9af5-7476fcac6246','fb32fd67-3462-4311-a38a-508ebc64cc2b','c1','fazendo isso… vai ser complicado demais pro seu lado ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BCBAE1244BBB5AFCF61"}'::jsonb,null,'2026-04-01T15:21:00.155416+00:00'),
('6741162b-153f-43e6-bd08-7f39a0fc806f','93cfbb62-9709-45a5-b946-363629aae7c3','c1','vê o que vc acha…','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BBBECAC4D3C499DA4E3"}'::jsonb,null,'2026-04-01T15:21:44.815389+00:00'),
('031a1f3e-c368-453c-9b11-8bdafcf8866f','9c0ec987-7d34-42e6-a83f-bc3022e204a0','c1','blza','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B7595B34E1AB11466BC"}'::jsonb,null,'2026-04-01T15:32:43.828857+00:00'),
('3c8140ca-54b2-4074-99d2-0aea4d76f762','45f5dd77-01de-408f-b24d-aa5abaf637e5','c1','vamos seguindo','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B925BBAF8C07E802BA4"}'::jsonb,null,'2026-04-01T15:32:46.34999+00:00'),
('5627138f-0b43-4d13-90b4-ad6eb642dc5d','2f55e95a-c8f7-4316-8b2b-e00a91450aca','c1','Olá boa tarde','inbound','text','Monise Oliveira','{"whatsapp_message_id": "AC0CBF5B8B75100D4D1B5B358A7E0DEC"}'::jsonb,null,'2026-04-01T18:15:41.340351+00:00'),
('04f1f2df-ed30-441b-9c7c-8491d5ee8903','2f55e95a-c8f7-4316-8b2b-e00a91450aca','c1','Pode atender ?!','inbound','text','Monise Oliveira','{"whatsapp_message_id": "AC9426BB55778FDC93C268F8C3F365D3"}'::jsonb,null,'2026-04-01T18:15:42.069564+00:00'),
('4a2d9371-f627-45f6-a967-7d2af04101a5','5503d4a2-2531-4c99-a596-4bfb6226de10','c1','API ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BBAE9C0B2E7F537B924"}'::jsonb,null,'2026-04-01T18:16:48.349059+00:00'),
('688a3430-b8b7-40ef-a5bc-a016b2ed7547','6f0e38b5-604d-403b-a6fc-b705b6c67086','c1','nao entendi','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B034384F578F0473F3C"}'::jsonb,null,'2026-04-01T18:16:49.748783+00:00'),
('d6124eca-13ae-448f-9f2f-366b7314c261','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068463599_jpcl6h.webp','inbound','image','Matheus Felipe','{"is_sticker": true, "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068463599_jpcl6h.webp", "mimetype": "image/webp", "whatsapp_message_id": "3EB0D31D4149E2FA6E7914"}'::jsonb,null,'2026-04-01T18:34:25.642034+00:00'),
('09156fd8-5d09-4c73-b5e8-0dccb7ccec19','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','acho q e ela q me mandou msg aqui','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB01078F1021DFDFD0EB5"}'::jsonb,null,'2026-04-01T18:34:27.521412+00:00'),
('6ed2f510-04b0-4639-8851-d3dc153f7122','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','mds, ela ainda nao entendeu?','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB0D4B6480F326EF5F219"}'::jsonb,null,'2026-04-01T18:34:40.778105+00:00'),
('050d756f-d6b7-4ac9-ad41-443441be0b3c','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','PQP','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB0E99022B88005796D6C"}'::jsonb,null,'2026-04-01T18:34:42.641788+00:00'),
('72e780b8-ad4e-457d-aaec-ca9aa00e89bd','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068551758_s5ktj7.ogg','inbound','audio','Matheus Felipe','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068551758_s5ktj7.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 20, "whatsapp_message_id": "3AEC3970FCDA53413688"}'::jsonb,null,'2026-04-01T18:35:52.728606+00:00'),
('4979cca9-9725-457c-88a6-c66b0125796c','043b28c6-fceb-430b-a529-2b9f9fa4a736','c1','ok','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B28B461E30D69E7C185"}'::jsonb,null,'2026-04-06T18:30:05.732994+00:00'),
('0f9d118b-c2e4-4b04-8c14-27219257f575','19072f23-c3d4-40b4-9645-beb55b770d5a','c1','teste','outbound','text','Você','{}'::jsonb,null,'2026-04-06T18:54:35.4324+00:00'),
('4f3d5953-fdf2-4fd5-ae0b-ae9db53da4cd','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068589987_yyjnpx.ogg','inbound','audio','Matheus Felipe','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775068589987_yyjnpx.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 24, "whatsapp_message_id": "3A837286B20419BC19B3"}'::jsonb,null,'2026-04-01T18:36:31.129083+00:00'),
('ce36bd51-0419-41ba-864a-e533c5e6111f','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775069511384_uj5qip.ogg','inbound','audio','Matheus Felipe','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775069511384_uj5qip.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 74, "whatsapp_message_id": "3AAAFEC4CDB594263C02"}'::jsonb,null,'2026-04-01T18:51:53.279125+00:00'),
('959ed4c8-01fc-4a5b-a223-f80caeaa32ca','5aaf1821-aa90-42e2-af0b-8f80e7b509d6','c1','vc ja fez ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B14B0F97D4EF8F30ACB"}'::jsonb,null,'2026-04-01T18:58:58.067021+00:00'),
('ff08443e-c72b-41aa-97bf-92133c497873','b11fd2b9-5fc5-44df-bf18-94e3ab870d9a','c1','to trabalhando no vps agora','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B4DC10F78B4E9D8DF59"}'::jsonb,null,'2026-04-01T18:59:01.093916+00:00'),
('c6f90864-2e78-4d78-aa57-e4bbb38d0b23','f577de51-1caa-41fb-82df-8b2ad2626640','c1','pode seguir','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BFFA6D843882CA347BB"}'::jsonb,null,'2026-04-01T19:38:35.9636+00:00'),
('6b29b995-142f-4984-a2c3-55e13692caaf','914c3f89-78bb-4cb7-9f5a-107c8e771188','c1','estou fazendo de um jeito que ele vai alterar automaticamente','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BD2CFBCEAE120B8B8F7"}'::jsonb,null,'2026-04-01T19:38:45.781058+00:00'),
('d53d00a8-8334-4171-ad2e-c193d044a7e3','77b4a6e6-e38b-456f-9a9f-a0bb13cd4e79','c1','Boa tarde','inbound','text','Larissa portes','{"whatsapp_message_id": "3A53F03A205784AF1105"}'::jsonb,null,'2026-04-01T20:09:51.744717+00:00'),
('6077dfac-9c5d-4bfb-978b-919ab27988a9','77b4a6e6-e38b-456f-9a9f-a0bb13cd4e79','c1','Entendi,obrigada','inbound','text','Larissa portes','{"whatsapp_message_id": "3A80B709CCD752CD039C"}'::jsonb,null,'2026-04-01T20:09:53.230873+00:00'),
('cc2eea69-0d45-4569-9c1c-d147b3724e0b','0ea6298c-8ed3-462c-9e0f-6abb2a41903d','c1','Opa boa tarde Vini, tudo joia e vc?','inbound','text','Mylena Marzochi','{"whatsapp_message_id": "3EB07258C81D1F448E3E70"}'::jsonb,null,'2026-04-01T21:03:19.6686+00:00'),
('8c986dc0-0bf8-4f4d-9022-7fd30fbc0d4d','0ea6298c-8ed3-462c-9e0f-6abb2a41903d','c1','Consigo sim, qual o número que elas estão utilizando agora?','inbound','text','Mylena Marzochi','{"whatsapp_message_id": "3EB0CE81D6E22148A09ED9"}'::jsonb,null,'2026-04-01T21:03:29.43752+00:00'),
('73c6bb2a-7536-4fcd-87c2-2f9bec6ca243','508f1c35-25bb-4db0-acd0-249c168f241f','c1','teste','outbound','text','Você','{}'::jsonb,null,'2026-04-01T21:52:20.571084+00:00'),
('c9e36f75-6633-4878-a685-322d6530b189','907a470f-27a0-4bb8-a350-5508156dcac2','c1','Pode mandar','inbound','text','Israel Lemos','{"whatsapp_message_id": "3A5F55C44E6DBB4F8EEC"}'::jsonb,null,'2026-04-01T21:58:09.884702+00:00'),
('67689b53-8da6-4ad3-9dec-18e7ad03e34f','38869224-cc15-46b4-88e7-272378531f44','c1','Não chegou','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AEACFF18B8ADE8628C1"}'::jsonb,null,'2026-04-01T21:58:58.875091+00:00'),
('6ab1fbaa-28aa-4661-93a3-fe5daee2ccfd','c011a1b3-ff9d-4ae8-b75a-8313798f09c9','c1','No WhatsApp','inbound','text','Israel Lemos','{"whatsapp_message_id": "3ABD270DD3B697ECD278"}'::jsonb,null,'2026-04-01T21:59:06.109202+00:00'),
('17e88a0e-a9e9-4c2e-b17e-9935ece763a8','7fb0b9f9-9ff5-45a4-b59d-103b9f75e2e0','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775080823721_noz4jx.jpg','inbound','image','Israel Lemos','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775080823721_noz4jx.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "4A5C3F9A86E5A51E5256"}'::jsonb,null,'2026-04-01T22:00:27.930411+00:00'),
('f3073bff-1ae0-4a0a-88f4-31f489b1ee38','692f6ce5-08f3-4b6b-9ba9-0494a6a5217a','c1','grupototumadm@gmail.com
o email do facebook','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BB2872CD1605482D17B"}'::jsonb,null,'2026-04-01T22:01:44.120135+00:00'),
('40361b94-ffe3-49b7-9aa1-721280c1a449','d2f3d341-52ad-417d-9408-dca12dfc37b3','c1','526405','inbound','text','Israel Lemos','{"whatsapp_message_id": "3ABBA7A21E68F63CB036"}'::jsonb,null,'2026-04-01T22:06:22.736214+00:00'),
('21d83893-5662-4394-b1fc-6959f2f59e43','e9d7e2fd-f7e7-4f28-a0d1-93419814b1ab','c1','deu certo ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BD436301D91AFF8D3F5"}'::jsonb,null,'2026-04-01T22:17:41.067699+00:00'),
('156984dc-efdb-458b-a5d2-b075a4e4d7ab','243cc021-cf8f-460b-9373-8527da8a98ee','c1','Bom dia Vini ! Tudo joia ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "1AECA972215A70B09074"}'::jsonb,null,'2026-04-02T11:00:06.953599+00:00'),
('a886c2f4-aeb0-4036-9924-642cab6ed6a1','a54830ab-feb0-4482-8bac-31b864a97f48','c1','e ai mano','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B1124308973AC16491B"}'::jsonb,null,'2026-04-02T11:17:49.48433+00:00'),
('9e8f2370-26c7-4eef-85b0-0de995f7f9c6','019bd946-061e-488f-84b5-64e97ea74df7','c1','como estamos ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B7CAD3AE660A3E7104D"}'::jsonb,null,'2026-04-02T11:17:51.071372+00:00'),
('7f29402f-3758-4a06-8f85-abbab4ad68da','1f305daf-bcbc-41b9-9222-e44c7e4912b4','c1','conseguimos terminar hoje pra testar ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B7D696ABEC18392B198"}'::jsonb,null,'2026-04-02T11:18:01.540389+00:00'),
('4f20f23c-4634-4dba-882b-8c4575e33b58','f4c88bc4-2bde-4076-a177-4dc2a46c1482','c1','ok','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B0F0B19CA56363972C3"}'::jsonb,null,'2026-04-02T11:53:02.228676+00:00'),
('53b0bd01-54a4-4787-96c8-fb8babf73d3f','fdfb9657-7463-4893-968f-ea1520f10e9a','c1','vc viu o lance da Derma','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B36EA08B195714D8A68"}'::jsonb,null,'2026-04-02T11:53:05.420798+00:00'),
('f53ad1b8-3885-440a-a2c3-3b7adba860bb','603fac77-d5c1-40ac-936c-5b3bc54678f8','c1','talvez o dominio principal do upixel esteja com problemas, dai vc usa o https://upixelcrm.lovable.app','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B9A31B17F87588105D4"}'::jsonb,null,'2026-04-02T12:34:57.349181+00:00'),
('cc928dcc-3a3f-43b1-8bc5-bd4ef47430d2','4da2e7bf-e148-462e-84ba-cc85714b97a6','c1','Vini','inbound','text','Israel Lemos','{"whatsapp_message_id": "3A7F6685F0F653390FAB"}'::jsonb,null,'2026-04-02T13:07:04.356402+00:00'),
('cc7be802-7a70-4c2d-84b9-5af757124d9b','602135bf-6ece-445d-9e84-47c1af505e03','c1','Para tudo e olha isso','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AC37F290DEEAAE304C5"}'::jsonb,null,'2026-04-02T13:07:07.260375+00:00'),
('c912561a-cd0b-4b92-874b-4b772097afa0','a09025a0-665a-469f-8b95-08c6a814c836','c1','https://vt.tiktok.com/ZSHMnYfWm/','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AE79E2A4C54A161E984"}'::jsonb,null,'2026-04-02T13:07:09.054434+00:00'),
('9342fb1c-9828-4b04-b232-02c870f8925f','5fd484f8-cc8d-4a38-8d6b-d94dd6aff874','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:09:51.93047+00:00'),
('d93e53e2-fa74-42be-b6ba-70213c51c459','d0ee8853-5b86-4c56-8653-3f7413224451','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:10:59.718785+00:00'),
('bc0b1a17-9bdd-4b9e-a489-55bf798b709d','eda657e5-3aed-4b03-91a0-39ab8ce647b1','c1','Já tinha feito ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3AFF460407F099805047"}'::jsonb,null,'2026-04-02T13:11:55.062691+00:00'),
('bfa61d3d-3aa1-481f-8999-c459aad6d3a6','9860ea50-074f-4bc9-8088-c6e295070711','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:12:05.7137+00:00'),
('d419c184-b8f8-44ab-af29-329d6af23da3','d355b290-34af-484a-a3fd-c31bbeac3ab0','c1','Outra coisa, ele tá privado no github ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "3A6F7F163363E9250E73"}'::jsonb,null,'2026-04-02T13:12:19.066863+00:00'),
('43bb46f8-e001-424c-9baf-8a9fcb4e0024','e4be9320-caa6-4cb8-9f19-3822d00acaef','c1','nao cheou ainda.. chengando eu mando','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B9A092A974015313DEF"}'::jsonb,null,'2026-04-06T18:30:12.722771+00:00'),
('26cbf932-d99f-452f-ac9a-b97b7ece00b7','4f534382-9997-42c6-841e-399c10d724f7','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:13:28.340953+00:00'),
('665fc626-eed5-4883-b46a-9343adc23ab5','0a7e037d-ff26-4016-af72-623adf07c403','c1','Ok','inbound','text','Israel Lemos','{"whatsapp_message_id": "3A66A9E5FD0C63E0B74C"}'::jsonb,null,'2026-04-02T13:14:00.264682+00:00'),
('9f978bc4-b9da-42d4-b79c-104450ac0149','da7ee7f3-52ec-4ac9-9a40-674c4906a26d','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:15:09.99734+00:00'),
('a561f20f-f568-4b7e-9c9e-1e3812acb98b','2f55e95a-c8f7-4316-8b2b-e00a91450aca','c1','Oiê Vinícius bom dia tudo bem ?','inbound','text','Monise Oliveira','{"whatsapp_message_id": "AC09A0DC3CC10BADE5567BE018D95AE8"}'::jsonb,null,'2026-04-02T13:15:18.032374+00:00'),
('8922f891-0014-44b3-acd6-c578ad6e9dc7','2f55e95a-c8f7-4316-8b2b-e00a91450aca','c1','Mandei mensagem ao Matheus, peço que passe o recado que preciso falar com ele por favor','inbound','text','Monise Oliveira','{"whatsapp_message_id": "AC96A763EF470258E05D19F53CCACADD"}'::jsonb,null,'2026-04-02T13:15:33.419167+00:00'),
('8f075de5-6ccf-4c45-b9a4-8a6348c717a6','665104c5-d7c9-46c5-8add-a4cc3642526a','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:17:41.652953+00:00'),
('270fdada-5760-475e-8a8a-ebdede143ec1','6bfded1d-5605-4b3a-bd3c-8f92efe802c5','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:21:39.584845+00:00'),
('c94e7401-90ea-4ce4-ac3d-0a7595eab820','fbb106e9-9438-4d14-8638-f77f17c39553','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:27:09.326819+00:00'),
('62b9a7f7-fbd1-474d-989d-a8378f20296c','eadc651d-17a7-4a0e-855a-dddbf4c9e90a','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:33:19.15765+00:00'),
('795709cc-8b70-499c-8bc2-d4f524bd277c','c09ebee5-ef9e-4b94-8b2e-69674f689f9f','c1','https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true','inbound','audio','Israel Lemos','{"media_url": "https://mmg.whatsapp.net/v/t62.7117-24/615255663_4178134822449022_6691569824659649226_n.enc?ccb=11-4&oh=01_Q5Aa4AEcHIvv7D6Yq_v6pZsk92H9f47oBy3g-H05g2nzqcYCiw&oe=69F5E814&_nc_sid=5e03e0&mms3=true", "mimetype": "audio/ogg; codecs=opus", "seconds": 28, "whatsapp_message_id": "3AADDDA421483F73A665"}'::jsonb,null,'2026-04-02T13:39:24.466474+00:00'),
('e078bf81-c8b9-412f-9c86-1f10b8438c54','77b4a6e6-e38b-456f-9a9f-a0bb13cd4e79','c1','Ei,bom dia!','inbound','text','Larissa portes','{"whatsapp_message_id": "3A9E17684383DAB684A0"}'::jsonb,null,'2026-04-02T14:05:04.268606+00:00'),
('4764506d-95d1-46d7-8537-6a49d04fa444','77b4a6e6-e38b-456f-9a9f-a0bb13cd4e79','c1','Somente o número do final 8510 que está sendo restringido,tem algum motivo específico? Sabe me dizer?','inbound','text','Larissa portes','{"whatsapp_message_id": "3ABD184CC45744101543"}'::jsonb,null,'2026-04-02T14:05:28.085087+00:00'),
('9f49428a-27fe-4b21-b76e-c016abf5633b','508f1c35-25bb-4db0-acd0-249c168f241f','c1','teste','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:17:55.228141+00:00'),
('cddbde09-821c-49a7-b014-c2499b8b3dca','e0ee6924-b361-487b-ab41-30d5da264556','c1','testando','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:18:10.61835+00:00'),
('2922f21b-6061-4692-a913-02c80f91fb76','fed9f35e-4c15-4472-aee4-b46f139da14c','c1','Vc consegue me passar o codigo do facebook que chegou no email do comercial totum??','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:21:52.139449+00:00'),
('af91d4ab-be08-46f7-8f29-ea3c792ae382','508f1c35-25bb-4db0-acd0-249c168f241f','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775499739513_7ycd0n.jpg','inbound','image','.','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1775499739513_7ycd0n.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "AC4B55A6C3B297F774792FAC3431A3B6"}'::jsonb,null,'2026-04-06T18:22:20.619794+00:00'),
('cbf31dd9-bdf5-4fd7-b6bd-c465fe7821a4','a4b7364e-0c68-4a56-8fa6-c12a03d7a503','c1','ok','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B12C7CEA2997C1E4090"}'::jsonb,null,'2026-04-06T18:22:43.01208+00:00'),
('ec24f63b-1f3c-406a-81cb-f56d31c51bf7','27b379b0-b58c-493f-bdf5-eb37632712e2','c1','pwei','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B6C5292B3E5528FBE5E"}'::jsonb,null,'2026-04-06T18:22:43.711405+00:00'),
('e3822697-d802-425d-bb2b-60a8d54a8a75','c60ee087-6135-40f5-a86d-55777ff31764','c1','Inclusive o whatsapp lite ja voltou a funcionar','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:23:05.898083+00:00'),
('feb354dd-6631-4f88-96fb-0c1bf141346c','0fd9686e-a579-4eab-ae06-2da95e3e6f51','c1','To conversando por ele inclusive','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:23:28.19557+00:00'),
('dc1595b6-c179-4821-abef-6ebfe8c509f5','da001689-d44a-4e2a-bf3d-c05c098b5e49','c1','não chegou codigo no gmail comercialgrupototum@gmail.com','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BD124DFCBEA6FFAE968"}'::jsonb,null,'2026-04-06T18:24:35.050349+00:00'),
('d6336616-4d9c-46b1-bad1-2ca2f238c80b','e420d1c6-b678-46a5-85b6-5d3515a7f239','c1','Mentira','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:26:37.371119+00:00'),
('a2a130fb-81df-4acb-a63f-375a9e544279','4cd98f6e-e60c-4bf9-a225-f8a5e0ed5683','c1','E no administrativo','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:26:55.852601+00:00'),
('10bb2db3-512f-4a56-9815-11ba74a5cf76','b3391cc6-4f44-495a-8a82-f116c987d646','c1','ah ta','inbound','text','Israel Lemos','{"whatsapp_message_id": "3B265DC0C25D38994DAC"}'::jsonb,null,'2026-04-06T18:27:17.586289+00:00'),
('ba7e4f1d-c031-43b8-9f33-bd7328a9b9cc','06bdd69d-24ac-48ab-883a-04b28cc25140','c1','perai','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BF69FC9973487522288"}'::jsonb,null,'2026-04-06T18:27:19.841312+00:00'),
('9c5536aa-6aa9-4020-9b3e-1e22de25fa94','5be438ed-0bb1-4cd9-ad6e-211a0f47f04d','c1','502365','inbound','text','Israel Lemos','{"whatsapp_message_id": "3BCAE9E0ED1A0FA53A10"}'::jsonb,null,'2026-04-06T18:27:48.04146+00:00'),
('e956698b-27b3-442c-a184-a883c397b8ac','e08a29ff-effe-40ed-9d4b-45d36073710f','c1','Agora vai chegar no Wpp','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:28:38.375563+00:00'),
('fc61890e-6904-40eb-960e-0d6352504ef8','508f1c35-25bb-4db0-acd0-249c168f241f','c1','teste','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-06T18:54:49.774931+00:00'),
('258bf67e-c895-4aae-b418-6dede3b9d213','508f1c35-25bb-4db0-acd0-249c168f241f','c1','teste','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-20T14:18:19.071917+00:00'),
('823a3673-a566-44ca-a258-23046693ebe9','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776695310726_3vhinz.ogg','inbound','audio','Matheus Felipe','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776695310726_3vhinz.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 72, "whatsapp_message_id": "3EB09E46CC4C35F648F1F4"}'::jsonb,null,'2026-04-20T14:28:31.909356+00:00'),
('0ab4270d-65ac-4978-aa7e-31c389714aa2','895fd7e6-d7ae-4c43-aa5c-e5bb019dd2bb','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776705968646_bao6ql.webp','inbound','image','Israel Lemos','{"is_sticker": true, "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776705968646_bao6ql.webp", "mimetype": "image/webp", "whatsapp_message_id": "3A217B5246319B0FDA2A"}'::jsonb,null,'2026-04-20T17:26:10.554166+00:00'),
('3e2194c0-0e32-43b2-8da8-163ef95bd14c','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Blz','outbound','text','Você','{"channel": "whatsapp"}'::jsonb,null,'2026-04-20T18:44:28.09293+00:00'),
('74022428-58a9-4e93-ab9f-1d184f6d7af6','20ac5c57-53e8-4e32-aa8e-fb24a679b796','c1','Bom dia Vini ! Tudo joia ?','inbound','text','Israel Lemos','{"whatsapp_message_id": "1A5925B9FD465BB776C7"}'::jsonb,null,'2026-04-22T11:00:10.317629+00:00'),
('156b5190-0ce6-473c-a9b7-a61dd9e0c4ce','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Cara bom dia, como estão as coisas aí?
Te falar se quisermos migrar um número da Totum pro nosso CRM já podemos né? Pra usar por ali? Pelo Lite msm com pouco fluxo','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A8F325DA8B2D647015B"}'::jsonb,null,'2026-04-22T12:03:18.008844+00:00'),
('b34dff19-8f08-4c29-a435-2aa7b5fee512','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Show, To com um aqui mas logo nele não tenho permissão pra fuçar nele','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A8C3F7A4FE896107ADA"}'::jsonb,null,'2026-04-22T12:05:03.808907+00:00'),
('c9122cd3-51a6-450a-a7ac-23dbffe78df6','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Pode ser o demo','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A1BDAB4A7D7F07ECB93"}'::jsonb,null,'2026-04-22T12:05:25.034799+00:00'),
('7bbebc91-1d0d-414c-8a36-9b7dea21e940','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Qual o link do oficial de uso da Totum?','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A388FD006BEC3675710"}'::jsonb,null,'2026-04-22T12:05:32.070822+00:00'),
('65aefa37-b922-4cca-ba45-baf7dffea414','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Kkk então é nele msm q tô','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A6654861AE81AC26E7A"}'::jsonb,null,'2026-04-22T12:05:55.198801+00:00'),
('2d624c0c-4b35-401e-b4ef-f42057997999','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','[Mensagem não suportada]','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3AAD9806683DAE09A923"}'::jsonb,null,'2026-04-22T12:06:19.944976+00:00'),
('f95e39a8-02ed-4f35-bbe3-cdd5a34576ec','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859579863_3iqjc2.jpg','inbound','image','Matheus Felipe','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859579863_3iqjc2.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3A862C8BB589C27D2EE4"}'::jsonb,null,'2026-04-22T12:06:21.235422+00:00'),
('8695e864-3af3-4225-b20f-ed2c1a837c7a','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859580878_2gx25f.jpg','inbound','image','Matheus Felipe','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859580878_2gx25f.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3AB2D95D64D0FF62893F"}'::jsonb,null,'2026-04-22T12:06:22.063223+00:00'),
('d0901098-6551-4b3a-87a4-4cba7dabb801','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Integrações, automações, relatórios','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3A1934625AC74C9A7E69"}'::jsonb,null,'2026-04-22T12:06:28.557582+00:00'),
('8c04f00b-715a-4389-9786-746a448695ee','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Tudo da essa tela','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3AD1C5B5BAB10C5E3F53"}'::jsonb,null,'2026-04-22T12:06:31.652607+00:00'),
('867126bf-8754-497f-b7c1-56ad1582315a','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','foi','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB0A994122750BE0B2016"}'::jsonb,null,'2026-04-22T12:08:37.956669+00:00'),
('5fb87dbf-c593-408e-a4fc-4084310746dc','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Vlw vinny','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB014238113AC62969A79"}'::jsonb,null,'2026-04-22T12:08:40.404205+00:00'),
('38a6ddb5-aaaa-4c58-a29a-06dc21fd45ed','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','blz','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB01EB5C5E534140ED036"}'::jsonb,null,'2026-04-22T12:10:29.947799+00:00'),
('abf6aade-934a-482b-b971-65bf8ca4396c','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912275_f2hjf7.jpg','inbound','image','Matheus Felipe','{"caption": "essa?", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912275_f2hjf7.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0E714FD75E209CF7CE6"}'::jsonb,null,'2026-04-22T12:12:07.976375+00:00'),
('f35d9646-559d-423e-a863-8639a2e31d20','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912276_bl7ndh.jpg','inbound','image','Matheus Felipe','{"caption": "Outra coisa fuçando aqui pra criar etapas de funil ta dando esse erro", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912276_bl7ndh.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0AB391E46EC303A5327"}'::jsonb,null,'2026-04-22T12:12:08.629237+00:00'),
('1786e0d3-4a86-4428-811a-c90408a92072','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912196_xuo0ja.jpg','inbound','image','Matheus Felipe','{"caption": "Ou Essa?", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859912196_xuo0ja.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB021E107BAB7F157E9FC"}'::jsonb,null,'2026-04-22T12:12:09.157765+00:00'),
('9f68140e-cfed-4c20-8cc3-30b9ac74689d','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859996065_0swuvj.jpg','inbound','image','Matheus Felipe','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859996065_0swuvj.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0D8D58EBBB4A66F8187"}'::jsonb,null,'2026-04-22T12:13:17.081324+00:00'),
('d7cca74f-a7ab-4014-8ef7-7510b82ac628','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860050944_jdnf5t.jpg','inbound','image','Matheus Felipe','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860050944_jdnf5t.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0D78F2165E1B29ADAB6"}'::jsonb,null,'2026-04-22T12:14:12.051671+00:00'),
('3ad1e23e-b95a-47ee-b70e-a9acc4d868b2','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860109100_zpqnmy.jpg','inbound','image','Matheus Felipe','{"caption": "", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860109100_zpqnmy.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0B98610A3564E83AD07"}'::jsonb,null,'2026-04-22T12:15:10.708767+00:00'),
('f0eb5503-3d8d-4012-81c7-bcddecdd6a6d','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860285154_f85ato.jpg','inbound','image','Matheus Felipe','{"caption": "Ai so conectar com o QR÷", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860285154_f85ato.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB053BDA2F94CEA81BCDE"}'::jsonb,null,'2026-04-22T12:18:07.485597+00:00'),
('cbe7e75c-0db8-4670-8f57-5d049d06ebae','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','?','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3EB0FA5EB0694E93A803B0"}'::jsonb,null,'2026-04-22T12:18:07.92823+00:00'),
('cb91bfbc-0a5a-420a-8949-261d5a301861','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860361803_txpcqw.jpg','inbound','image','Matheus Felipe','{"caption": "deu isso", "media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776860361803_txpcqw.jpg", "mimetype": "image/jpeg", "whatsapp_message_id": "3EB0E8F67CB0FF36A82500"}'::jsonb,null,'2026-04-22T12:19:22.920286+00:00'),
('5aa7b2c6-b7de-4a6b-8845-5c18fd93042a','4d017930-a4ac-4ee0-836c-84102b5d3143','c1','Msm tela','inbound','text','Matheus Felipe','{"whatsapp_message_id": "3ADFA8EBC631B3F1D33E"}'::jsonb,null,'2026-04-22T12:21:51.348102+00:00'),
('9e723061-1c9f-4c14-ad30-ad745dbf34e2','baca14a5-3d57-4f3e-bfe5-626508d328fd','c1','https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859954959_6oo4xx.ogg','inbound','audio','Israel Lemos','{"media_url": "https://lliciixbnielenwsyeop.supabase.co/storage/v1/object/public/whatsapp_media/1776859954959_6oo4xx.ogg", "mimetype": "audio/ogg; codecs=opus", "seconds": 32, "transcript": "Esta é uma transcrição simulada do áudio. O áudio parece falar sobre o novo projeto de CRM.", "whatsapp_message_id": "3ADBCA599C4ADE42D156"}'::jsonb,null,'2026-04-22T12:12:37.513498+00:00')
ON CONFLICT (id) DO NOTHING;

-- tasks (9 rows)
INSERT INTO public.tasks (id, client_id, lead_id, title, description, due_date, assigned_to, status, tenant_id, created_at) VALUES
('176e5937-09c3-4fed-ade8-3203b70d79a1','c1','623933ad-6e72-481e-bbe1-8a1243872049','Ligar para Carlos',null,null,'Você','completed',null,'2026-03-24T23:00:57.172902+00:00'),
('1c03867a-155b-4bca-9a61-3f9a5212bf68','c1','623933ad-6e72-481e-bbe1-8a1243872049','teste',null,'2027-03-01','Você','pending',null,'2026-03-26T11:38:34.400412+00:00'),
('de01067c-cda1-4f64-a6e1-7fe9567be267','c1','310f0ccb-4234-47d2-80a3-bb94da2b4e12','Enviar proposta comercial',null,null,'Você','pending',null,'2026-03-27T12:22:37.466811+00:00'),
('cb4dddaf-802d-4ac8-92c3-f6706159e21a','demo1','e37a947a-178d-4f0c-b7d3-f6bff0250e9b','Ligar para Carlos - apresentação executiva',null,'2026-04-02','Demo uPixel','pending',null,'2026-03-30T16:00:33.31995+00:00'),
('12476365-2b76-4083-8432-756db887d15c','demo1','20e7c375-5e6c-4f64-8e18-f67619c533e1','Enviar proposta comercial',null,'2026-04-01','Demo uPixel','pending',null,'2026-03-30T16:00:33.31995+00:00'),
('27b62bed-603c-45b5-8944-d46a68bd0095','demo1','b98b762e-c38d-4eb5-93b2-8a043e1a0bcc','Follow-up proposta enviada',null,'2026-03-31','Demo uPixel','pending',null,'2026-03-30T16:00:33.31995+00:00'),
('e9a2341d-d0f2-4f78-95cd-b095991f2c35','demo1','df4cea9e-7fda-4045-90c5-36e5c9c5544e','Agendar reunião de negociação',null,'2026-04-03','Demo uPixel','pending',null,'2026-03-30T16:00:33.31995+00:00'),
('58929ebb-535a-4fee-9d1e-8654fac8ddd2','demo1','9017c300-d542-416c-a47e-2ebe9110a554','Preparar contrato final',null,'2026-03-28','Demo uPixel','completed',null,'2026-03-30T16:00:33.31995+00:00'),
('22b714fb-3b6f-4c6c-a9c2-ecf139fdbc22','demo1','dd9126ff-8736-4284-8b61-0e78c43b5113','Enviar case de sucesso',null,'2026-04-04','Demo uPixel','pending',null,'2026-03-30T16:00:33.31995+00:00')
ON CONFLICT (id) DO NOTHING;

-- timeline_events (32 rows)
INSERT INTO public.timeline_events (id, client_id, lead_id, type, content, user_name, tenant_id, created_at) VALUES
('b45fc82f-2b48-4a43-9920-2336c12ce048','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','Lead "Carlos Teste" criado e adicionado ao pipeline','Sistema',null,'2026-03-24T22:59:09.12519+00:00'),
('97a3a537-16a2-42c1-9b9e-bbb5e6306fb7','default','623933ad-6e72-481e-bbe1-8a1243872049','task','Tarefa criada: Ligar para Carlos','Usuário',null,'2026-03-24T23:00:57.550288+00:00'),
('11d5cb8f-28c8-4248-8b52-b7aa3525fd37','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Novos Leads','Usuário',null,'2026-03-25T16:25:13.80805+00:00'),
('22f7f8d2-f55e-458b-b18f-5105f8565d39','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Novos Leads para Qualificação','Usuário',null,'2026-03-25T16:25:13.886362+00:00'),
('7f16ea5e-cdb4-488f-8f9a-ca4289490038','default','623933ad-6e72-481e-bbe1-8a1243872049','task','Tarefa criada: teste','Usuário',null,'2026-03-26T11:38:34.834949+00:00'),
('0e9abc7c-4d67-45eb-b307-60ff2777a4db','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Novos Leads para Qualificação','Usuário',null,'2026-03-26T11:47:44.943214+00:00'),
('677886e0-bf71-42ac-aa63-ee8c763cadb2','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Novos Leads','Usuário',null,'2026-03-26T11:47:49.85143+00:00'),
('8bc4c201-f5b3-4d79-bed2-df4698ff00b8','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Novos Leads para Qualificação','Usuário',null,'2026-03-26T11:47:51.604502+00:00'),
('3ef72a0b-6ea6-414e-af83-f073d5333aa0','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Proposta','Usuário',null,'2026-03-26T11:47:52.101483+00:00'),
('d9ef1529-7290-42c7-ac49-720f1f23a37a','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Proposta para Negociação','Usuário',null,'2026-03-26T11:47:53.460719+00:00'),
('85561a09-4f88-48d5-a5c0-6fd84c8bd096','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Negociação para Fechamento','Usuário',null,'2026-03-26T11:47:53.821709+00:00'),
('8348aa65-f9d7-459c-b88f-8edb8bc39d05','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Fechamento para Negociação','Usuário',null,'2026-03-26T11:47:54.559952+00:00'),
('9e090e83-3928-4bf1-82e9-aa23fde1a771','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Negociação para Proposta','Usuário',null,'2026-03-26T11:47:55.529586+00:00'),
('7518a8cb-ca53-4349-a64b-eaec479ead6e','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Proposta para Qualificação','Usuário',null,'2026-03-26T11:47:56.007208+00:00'),
('46dfa59c-ef6b-477c-ab2a-a4f2780fe46f','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Novos Leads','Usuário',null,'2026-03-26T11:47:56.19643+00:00'),
('d8760afb-bc10-4497-a717-8ca7de5cd467','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Novos Leads para Qualificação','Usuário',null,'2026-03-26T20:39:07.982983+00:00'),
('5a36f56c-9c67-41b6-a260-837a474b6daa','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Novos Leads','Usuário',null,'2026-03-26T20:39:11.393538+00:00'),
('30cf1d21-6009-4364-ac29-98e39b7aec2b','default','310f0ccb-4234-47d2-80a3-bb94da2b4e12','stage_change','Lead "Maria Silva" criado e adicionado ao pipeline','Sistema',null,'2026-03-27T12:20:22.424328+00:00'),
('3e78de5e-a172-45c9-b592-c3cd7211f7f4','default','310f0ccb-4234-47d2-80a3-bb94da2b4e12','note','Lead atualizado','Usuário',null,'2026-03-27T12:21:56.170092+00:00'),
('0b3fa761-2421-4d51-b59b-f3806bec9be6','default','310f0ccb-4234-47d2-80a3-bb94da2b4e12','task','Tarefa criada: Enviar proposta comercial','Usuário',null,'2026-03-27T12:22:37.683316+00:00'),
('c01fd726-f41e-4f13-8217-5061fd6a35a9','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Novos Leads para Qualificação','Usuário',null,'2026-03-27T21:42:18.978708+00:00'),
('fda54fc1-ba06-4a7e-982b-55b2f9583e34','default','623933ad-6e72-481e-bbe1-8a1243872049','stage_change','"Carlos Teste" movido de Qualificação para Proposta','Usuário',null,'2026-03-30T12:40:43.705052+00:00'),
('5f50c3ce-f013-477c-928f-db90aba5631d','default','310f0ccb-4234-47d2-80a3-bb94da2b4e12','note','Lead atualizado','Usuário',null,'2026-03-30T14:51:18.097349+00:00'),
('b4076ae5-2c19-4c86-9296-2bc26356c2a1','demo1','e37a947a-178d-4f0c-b7d3-f6bff0250e9b','stage_change','Lead entrou no pipeline Vendas B2B','Sistema',null,'2026-03-30T16:00:33.31995+00:00'),
('532cc74d-a098-4688-9695-e138eeb621e5','demo1','20e7c375-5e6c-4f64-8e18-f67619c533e1','note','Roberto tem urgência no projeto. Priorizar.','Demo uPixel',null,'2026-03-30T16:00:33.31995+00:00'),
('a13cd4b1-f451-4c46-9755-8169b2d05deb','demo1','b98b762e-c38d-4eb5-93b2-8a043e1a0bcc','message','Proposta enviada por e-mail com detalhamento técnico','Demo uPixel',null,'2026-03-30T16:00:33.31995+00:00'),
('9ca6e5ed-f4c7-4444-b40d-483618884683','demo1','9017c300-d542-416c-a47e-2ebe9110a554','stage_change','Negócio fechado - R$ 180.000','Sistema',null,'2026-03-30T16:00:33.31995+00:00'),
('21cb26c0-e46c-48c1-b507-7f8e7fe8b631','demo1','df4cea9e-7fda-4045-90c5-36e5c9c5544e','stage_change','Movido para Negociação','Sistema',null,'2026-03-30T16:00:33.31995+00:00'),
('ea801ae4-1499-4a62-aedf-a5e6c05562c4','c1','0e2465e7-bb77-4561-a280-232d7151f95e','stage_change','Lead "Matheus Felipe" criado automaticamente via WhatsApp','Sistema',null,'2026-03-31T21:28:49.228205+00:00'),
('d5759ba3-41c5-4fd9-a01f-a20bee7b1af3','c1','a0ea054b-7596-4ab3-998a-356eaf0586a4','stage_change','Lead "Monise Oliveira" criado automaticamente via WhatsApp','Sistema',null,'2026-04-01T18:15:40.988726+00:00'),
('705c1511-c443-474b-af12-b7a89d3bd320','c1','05b57228-6a4d-4acc-9c23-c0d0cff43957','stage_change','Lead "Larissa portes" criado automaticamente via WhatsApp','Sistema',null,'2026-04-01T20:09:51.291526+00:00'),
('5b7a1b8f-bd4a-46c4-8ac9-2551c8c9535f','c1','386deae7-1cdf-4794-a38f-d93971da28bf','stage_change','Lead "Mylena Marzochi" criado automaticamente via WhatsApp','Sistema',null,'2026-04-01T21:03:19.310629+00:00')
ON CONFLICT (id) DO NOTHING;

-- integrations (5 rows)
INSERT INTO public.integrations (id, client_id, provider, access_token, refresh_token, token_expires_at, config, status, tenant_id, created_at, updated_at) VALUES
('883742ee-bf95-4d33-832b-e31f422b10f0','c1','google_credentials',null,null,null,'{"google_client_id": "REDACTED", "google_client_secret": "REDACTED"}'::jsonb,'configured',null,'2026-03-31T13:14:16.834666+00:00','2026-03-31T13:16:37.617622+00:00'),
('7c699e27-ee3a-472e-9a3d-18dbdbc59fc0','c1','whatsapp_official',null,null,null,'{"access_token": "REDACTED", "api_key": "REDACTED", "api_url": "evolution.grupototum.com/", "business_id": "657988843878712", "instance_name": "teste 2", "phone_number_id": "963235993550048"}'::jsonb,'configured',null,'2026-04-02T13:49:46.905059+00:00','2026-04-23T01:16:01.866636+00:00'),
('d3aa2173-c204-476c-871a-beae2432186b','c1','google',null,null,null,'{}'::jsonb,'needs_reconfig',null,'2026-03-31T13:36:25.140492+00:00','2026-04-06T18:46:58.860808+00:00'),
('1094fc84-036d-4c61-b81d-df30f87133e9','69154877-6805-4eb6-8e20-a535f663b827','whatsapp',null,null,null,'{"api_key": "REDACTED", "api_url": "https://evolution.grupototum.com/", "instance_name": "matheusfelipemktg@gmail.com"}'::jsonb,'configured',null,'2026-04-22T12:17:35.17785+00:00','2026-04-22T12:21:31.663459+00:00'),
('971df672-d719-484c-ac33-eb903c0157b1','c1','whatsapp',null,null,null,'{"api_key": "REDACTED", "api_url": "https://evolution.grupototum.com/", "instance_name": "vinicius"}'::jsonb,'configured',null,'2026-03-31T14:00:33.959675+00:00','2026-04-22T12:23:22.794547+00:00')
ON CONFLICT (id) DO NOTHING;

-- automations (3 rows)
INSERT INTO public.automations (id, client_id, name, trigger_type, nodes, edges, status, tenant_id, created_at, updated_at) VALUES
('d74841ff-f8eb-4aa7-84c2-03c879e72c4e','c1','Nova Automação 1',null,'[{"data": {"label": "Início do Fluxo", "type": "new_lead"}, "height": 98, "id": "1", "position": {"x": 250, "y": 150}, "positionAbsolute": {"x": 250, "y": 150}, "type": "trigger", "width": 250}, {"data": {"label": "Ação CRM"}, "dragging": false, "height": 98, "id": "851d82e9-02e8-427c-baf7-fd193eba3fd5", "position": {"x": 740, "y": 0}, "positionAbsolute": {"x": 740, "y": 0}, "selected": true, "type": "action", "width": 250}, {"data": {"label": "Mensagem"}, "dragging": false, "height": 98, "id": "49c864c7-2d1a-4785-a12d-28ec76ec55fd", "position": {"x": 780, "y": 300}, "positionAbsolute": {"x": 780, "y": 300}, "selected": false, "type": "message", "width": 250}, {"data": {"label": "Teste A/B"}, "dragging": false, "height": 107, "id": "e28dc501-71de-4bec-b6f0-3a612102962b", "position": {"x": 280, "y": 360}, "positionAbsolute": {"x": 280, "y": 360}, "selected": false, "type": "randomizer", "width": 200}, {"data": {"configType": "minutes", "label": "Espera (Delay)"}, "dragging": false, "height": 98, "id": "9d473995-6c0b-42c4-9446-10dde6a3e72d", "position": {"x": 520, "y": 40}, "positionAbsolute": {"x": 520, "y": 40}, "selected": false, "type": "delay", "width": 200}]'::jsonb,'[]'::jsonb,'draft',null,'2026-03-27T21:13:45.544189+00:00','2026-03-27T21:21:04.016665+00:00'),
('2caad992-9271-4b4d-b722-f13524aa77c5','c1','Nova Automação 2',null,'[]'::jsonb,'[]'::jsonb,'draft',null,'2026-03-31T15:20:39.673286+00:00','2026-03-31T15:20:39.673286+00:00'),
('694fcad9-fe42-4d66-ba2a-6f0533bc899d','c1','Nova Automação 3',null,'[{"data": {"configType": "message_received", "label": "Início do Fluxo", "type": "new_lead"}, "dragging": false, "height": 122, "id": "1", "position": {"x": 250, "y": 150}, "positionAbsolute": {"x": 250, "y": 150}, "selected": true, "type": "trigger", "width": 250}, {"data": {"conditions": [{"type": "message_contains", "value": "oi"}], "label": "Condição (If)"}, "dragging": false, "height": 118, "id": "bdb505f1-ba5f-47c0-a3da-5726773bc659", "position": {"x": 940, "y": 220}, "positionAbsolute": {"x": 940, "y": 220}, "selected": false, "type": "condition", "width": 250}]'::jsonb,'[{"animated": true, "id": "reactflow__edge-1-bdb505f1-ba5f-47c0-a3da-5726773bc659", "markerEnd": {"type": "arrowclosed"}, "source": "1", "sourceHandle": null, "style": {"strokeWidth": 2}, "target": "bdb505f1-ba5f-47c0-a3da-5726773bc659", "targetHandle": null, "type": "smoothstep"}]'::jsonb,'draft',null,'2026-04-15T15:17:31.24128+00:00','2026-04-15T15:26:22.443981+00:00')
ON CONFLICT (id) DO NOTHING;

-- automation_rules (6 rows)
INSERT INTO public.automation_rules (id, client_id, pipeline_id, column_id, name, trigger, actions, exceptions, active, tenant_id, created_at, updated_at) VALUES
('473a9acd-fd0d-48c0-acf5-f62bc56c4a64','c1','7d5fbd6a-bb5b-4cc1-a7cc-095f12de190b','1e762213-b5e6-4e8f-a367-9b613e7ee78f','Nova Automação 81','{"type": "stage_changed"}'::jsonb,'[{"config": {"tag": "novo"}, "type": "add_tag"}, {"config": {"tag": "deu certo"}, "type": "add_tag"}]'::jsonb,'[]'::jsonb,true,null,'2026-03-30T17:59:19.699255+00:00','2026-03-30T17:59:19.699255+00:00'),
('286bb48a-44af-47fe-aa7d-28dbd80b1cee','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9',null,'Ação de Tempo 44','{"config": {"hours": 24}, "type": "time_in_column"}'::jsonb,'[{"config": {"text": "Olá! Como podemos ajudar?"}, "type": "send_message"}]'::jsonb,'[]'::jsonb,true,null,'2026-03-30T19:06:09.162383+00:00','2026-03-30T19:06:09.162383+00:00'),
('1cecd87f-c0db-4188-a6fd-b38355e1dcb7','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9',null,'Ação de Tempo 35','{"config": {"hours": 24, "target_lead_ids": ["42b67b95-ae8f-46fa-baa1-1af8a60c7206"]}, "type": "time_in_column"}'::jsonb,'[{"config": {"text": "Olá! Como podemos ajudar?"}, "type": "send_message"}]'::jsonb,'[]'::jsonb,true,null,'2026-03-30T19:24:10.596437+00:00','2026-03-30T19:24:10.596437+00:00'),
('a3d595ad-512d-40df-ac1d-5a3d8439138e','c1',null,null,'Ação de Tempo 47','{"config": {"hours": 24}, "type": "time_in_column"}'::jsonb,'[{"config": {"text": "Olá! Como podemos ajudar?"}, "type": "send_message"}]'::jsonb,'[]'::jsonb,true,null,'2026-03-31T11:39:17.069781+00:00','2026-03-31T11:39:17.069781+00:00'),
('4213cec7-1484-4838-9315-16aa5c951f8e','c1','6123c2ec-eb5b-42b4-8d2a-eca757cc1bb9','e9428be9-4de4-4433-91d3-d341259cdc0d','Nova automação tesdte','{"type": "card_entered"}'::jsonb,'[{"config": {"tag": "deu certo 2"}, "type": "add_tag"}, {"config": {"tag": "certinhop"}, "type": "add_tag"}]'::jsonb,'[]'::jsonb,true,null,'2026-03-30T18:20:40.774418+00:00','2026-03-30T18:20:40.774418+00:00'),
('acd72f10-d439-4ae1-bab1-6db3096c0448','69154877-6805-4eb6-8e20-a535f663b827','2a95eb3c-287c-42d9-bd4a-f76db46b1fe2',null,'Nova Automação 32','{"type": "card_entered"}'::jsonb,'[{"config": {"tag": "novo"}, "type": "add_tag"}]'::jsonb,'[]'::jsonb,true,null,'2026-04-22T13:18:42.654805+00:00','2026-04-22T13:18:42.654805+00:00')
ON CONFLICT (id) DO NOTHING;

-- Verificacao
SELECT
  (SELECT COUNT(*) FROM public.pipelines)         AS pipelines,
  (SELECT COUNT(*) FROM public.pipeline_columns)  AS pipeline_columns,
  (SELECT COUNT(*) FROM public.leads)             AS leads,
  (SELECT COUNT(*) FROM public.conversations)     AS conversations,
  (SELECT COUNT(*) FROM public.messages)          AS messages,
  (SELECT COUNT(*) FROM public.tasks)             AS tasks,
  (SELECT COUNT(*) FROM public.timeline_events)   AS timeline_events,
  (SELECT COUNT(*) FROM public.integrations)      AS integrations,
  (SELECT COUNT(*) FROM public.automations)       AS automations,
  (SELECT COUNT(*) FROM public.automation_rules)  AS automation_rules;
