-- ════════════════════════════════════════════════════════════════════════
-- 00-extensions.sql — habilita as extensions que o uPixel CRM precisa.
--
-- Roda automaticamente no primeiro start do container Postgres (mecanismo
-- padrão do docker-entrypoint-initdb.d), como superuser.
--
-- pg_cron e pg_net também precisam estar em `shared_preload_libraries`
-- (ver ../postgresql.conf) — CREATE EXTENSION sozinho não basta para eles.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgsodium;
create extension if not exists pgjwt;
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_graphql;

-- Repassa permissão de uso do pg_cron para os roles de serviço (o
-- automation-worker cron será criado por uma migration do repo, não aqui).
grant usage on schema cron to postgres;
