-- ================================================================
-- IMPORT: auth.users + organizations + profiles
-- VERSAO: 2 (sem DISABLE TRIGGER em auth.users)
--
-- Estratégia:
--   1. INSERT auth.users → trigger on_auth_user_created dispara e
--      cria profiles com dados padrão (não importa, vamos sobrescrever)
--   2. INSERT organizations (dependência de FK dos profiles)
--   3. DISABLE trigger enforce_profile_immutable em public.profiles
--      (possível pois public.profiles pertence ao role 'postgres')
--   4. UPSERT profiles com dados corretos
--   5. ENABLE trigger de volta
-- ================================================================

-- ───────── 1. AUTH USERS ─────────
-- O trigger on_auth_user_created vai criar profiles automaticamente.
-- Ignoramos conflito (caso o usuário já exista).

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change, instance_id
) VALUES
(
  'dcb4bd86-b51b-4e4d-96f8-704d0adc6502','authenticated','authenticated',
  'test@upixel.com',
  '$2a$10$.X3sG2fdULi6XUnxN2TUyOymPgfSyejdB3JiwCL8hRJauNwl1srqa',
  '2026-04-10 19:05:23.282991+00','2026-04-10 19:05:23.186788+00',now(),
  '{"email":"test@upixel.com","email_verified":true,"name":"Test Admin","new_org_name":"Test Corp","phone_verified":false,"role":"vendedor","sub":"dcb4bd86-b51b-4e4d-96f8-704d0adc6502"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  '7d036567-e1b4-4418-8d7c-6677a95929b4','authenticated','authenticated',
  'master@upixel.com.br',
  '$2a$10$lcMTcGxJoTtPCO3J0rbNp.wFRngp/HjVPNL9CxyFLZeoC0R0qKqTO',
  '2026-03-30 15:58:53.022837+00','2026-03-30 15:58:52.962142+00',now(),
  '{"client_id":"c1","email_verified":true,"name":"Master uPixel","role":"supervisor"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  '4d8514de-aadb-4bea-8e9b-accde69bef5a','authenticated','authenticated',
  'viniciuscarmooliveira@gmail.com',
  '$2a$10$5.xrMqFklbGikmNycwBaFO543ZosVOmE0ArREQUna1JEXPCTnRvIe',
  '2026-04-06 18:46:38.556067+00','2026-04-06 18:46:38.510642+00',now(),
  '{"email":"viniciuscarmooliveira@gmail.com","email_verified":true,"name":"Vinicius Oliveira","phone_verified":false,"role":"vendedor","sub":"4d8514de-aadb-4bea-8e9b-accde69bef5a"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  'b8fe7827-6c85-4e3a-9d0f-be2bd4d08d5f','authenticated','authenticated',
  'demo@upixel.com.br',
  '$2a$10$/lH4TMBnMBuj587M7yv.YePe2FYtse7fWIJUhNmuGPoE7UYZBAsWu',
  '2026-03-30 15:58:54.03437+00','2026-03-30 15:58:54.0196+00',now(),
  '{"client_id":"demo1","email_verified":true,"name":"Demo uPixel","role":"supervisor"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  'f2845b14-11ba-4dfc-92f1-904947349639','authenticated','authenticated',
  'admin@upixel.com.br',
  '$2a$10$NvpL235LQMMS8TDQnL2TCewlrOi1/mZ096OhvIKOwgQtsf9hUIYkO',
  '2026-03-30 15:23:38.101671+00','2026-03-30 15:23:37.995608+00',now(),
  '{"email":"admin@upixel.com.br","email_verified":true,"name":"Admin uPixel","phone_verified":false,"role":"supervisor","sub":"f2845b14-11ba-4dfc-92f1-904947349639"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  '69154877-6805-4eb6-8e20-a535f663b827','authenticated','authenticated',
  'matheusfelipemktg@gmail.com',
  '$2a$10$gc1jvquDzba6I4luD5wagu5I5Cwz4.4OZOcTe3EAQxhbfimYBt2ry',
  '2026-04-01 13:48:40.205307+00','2026-04-01 13:48:40.110383+00',now(),
  '{"email":"matheusfelipemktg@gmail.com","email_verified":true,"name":"Matheus Felipe","phone_verified":false,"role":"vendedor","sub":"69154877-6805-4eb6-8e20-a535f663b827"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
),
(
  'f359f8ff-3cf7-4886-8d60-6914e5cc2fca','authenticated','authenticated',
  'teste@teste.com',
  '$2a$10$fKzbpVXWTQYDnr9TWOupjOleGeCLb7jUSca1ac3IZChKhzbZJtN/O',
  '2026-04-07 20:00:40.698163+00','2026-04-07 20:00:40.582298+00',now(),
  '{"email":"teste@teste.com","email_verified":true,"name":"teste","new_org_name":"teste","phone_verified":false,"role":"vendedor","sub":"f359f8ff-3cf7-4886-8d60-6914e5cc2fca"}'::jsonb,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '','','','','00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

-- ───────── 2. ORGANIZATIONS ─────────
INSERT INTO public.organizations (id, name, slug, owner_id, created_at, updated_at) VALUES
('69264277-2c67-4b4b-89bd-b0b4ed86c2e3','Totum','totum-1775586705094','7d036567-e1b4-4418-8d7c-6677a95929b4','2026-04-07 18:31:44.953424+00','2026-04-07 18:31:44.953424+00'),
('3c4521bd-ff99-43f3-81c0-c9259220b33f','teste','teste-f359f8ff','f359f8ff-3cf7-4886-8d60-6914e5cc2fca','2026-04-07 20:00:40.579103+00','2026-04-07 20:00:40.579103+00'),
('39bee014-d56d-4c96-926e-d0f7b2d3e0ee','Test Corp','test-corp-dcb4bd86','dcb4bd86-b51b-4e4d-96f8-704d0adc6502','2026-04-10 19:05:23.182779+00','2026-04-10 19:05:23.182779+00')
ON CONFLICT (id) DO NOTHING;

-- ───────── 3. PROFILES (com dados corretos) ─────────
-- Desabilita trigger de imutabilidade (permitido pois public.profiles
-- pertence ao role 'postgres', diferente de auth.users).
ALTER TABLE public.profiles DISABLE TRIGGER enforce_profile_immutable;

INSERT INTO public.profiles (
  id, client_id, name, email, role, avatar_url,
  is_blocked, organization_id, tenant_id, created_at, updated_at
) VALUES
('b8fe7827-6c85-4e3a-9d0f-be2bd4d08d5f','demo1','Demo uPixel','demo@upixel.com.br','supervisor',null,false,null,null,'2026-03-30 15:58:54.017381+00','2026-03-30 15:58:54.017381+00'),
('7d036567-e1b4-4418-8d7c-6677a95929b4','c1','Master uPixel','master@upixel.com.br','master',null,false,'69264277-2c67-4b4b-89bd-b0b4ed86c2e3',null,'2026-03-30 15:58:52.957755+00','2026-04-07 18:31:45.722651+00'),
('f2845b14-11ba-4dfc-92f1-904947349639','f2845b14-11ba-4dfc-92f1-904947349639','Admin uPixel','admin@upixel.com.br','supervisor',null,false,null,null,'2026-03-30 15:23:37.992376+00','2026-04-07 19:57:04.117444+00'),
('f359f8ff-3cf7-4886-8d60-6914e5cc2fca','f359f8ff-3cf7-4886-8d60-6914e5cc2fca','teste','teste@teste.com','vendedor',null,false,'3c4521bd-ff99-43f3-81c0-c9259220b33f',null,'2026-04-07 20:00:40.579103+00','2026-04-07 20:07:36.043234+00'),
('dcb4bd86-b51b-4e4d-96f8-704d0adc6502','dcb4bd86-b51b-4e4d-96f8-704d0adc6502','Test Admin','test@upixel.com','vendedor',null,false,'39bee014-d56d-4c96-926e-d0f7b2d3e0ee',null,'2026-04-10 19:05:23.182779+00','2026-04-10 19:05:23.182779+00'),
('69154877-6805-4eb6-8e20-a535f663b827','69154877-6805-4eb6-8e20-a535f663b827','Matheus Felipe','matheusfelipemktg@gmail.com','master',null,false,null,null,'2026-04-01 13:48:40.105117+00','2026-04-22 12:07:36.383433+00'),
('4d8514de-aadb-4bea-8e9b-accde69bef5a','c1','Vinicius Oliveira','viniciuscarmooliveira@gmail.com','master',null,false,'69264277-2c67-4b4b-89bd-b0b4ed86c2e3',null,'2026-04-06 18:46:38.509224+00','2026-04-22 12:07:52.247631+00')
ON CONFLICT (id) DO UPDATE SET
  client_id       = EXCLUDED.client_id,
  name            = EXCLUDED.name,
  email           = EXCLUDED.email,
  role            = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  is_blocked      = EXCLUDED.is_blocked,
  tenant_id       = EXCLUDED.tenant_id,
  updated_at      = EXCLUDED.updated_at;

-- Reabilita trigger
ALTER TABLE public.profiles ENABLE TRIGGER enforce_profile_immutable;

-- ───────── Verificação ─────────
SELECT
  (SELECT COUNT(*) FROM auth.users)        AS users,
  (SELECT COUNT(*) FROM public.profiles)   AS profiles,
  (SELECT COUNT(*) FROM public.organizations) AS organizations;
