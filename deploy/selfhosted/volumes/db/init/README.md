# `volumes/db/init/` — scripts de inicialização do Postgres

Este diretório é montado em `/docker-entrypoint-initdb.d` — tudo aqui roda
**uma única vez**, no primeiro start do container `db` (banco vazio).

## O que já está preparado

- `00-extensions.sql` — habilita `pg_cron`, `pg_net`, `pgsodium`, `pgjwt`,
  `pgcrypto`, `uuid-ossp`, `pg_graphql`.

## O que falta — **[OPERADOR], antes de rodar a Fase 1 de verdade**

O stack oficial do Supabase self-hosted cria, nesta mesma pasta, os roles e
schemas internos que GoTrue/PostgREST/Storage/Realtime esperam encontrar
(`supabase_admin`, `authenticator`, `anon`, `authenticated`, `service_role`,
`supabase_auth_admin`, `supabase_storage_admin`, schemas `auth`/`storage`/
`_realtime`, grants entre eles, etc.) — são ~4 arquivos SQL grandes e
versionados junto com cada release da imagem `supabase/postgres`.

**Não foram reproduzidos à mão aqui de propósito**: são centenas de linhas
de `CREATE ROLE`/`GRANT` cujo conteúdo exato varia por versão da imagem, e
reescrever isso de memória arrisca um erro sutil de permissão que só
aparece depois do restore (fora do escopo desta sessão — que não pode
executar nada contra infra real). O jeito seguro é puxar os arquivos
oficiais na hora de subir a VPS:

```bash
# Na VPS, antes do primeiro `docker compose up`:
git clone --depth 1 --branch <tag-compatível-com-as-imagens-do-compose> \
  https://github.com/supabase/supabase.git /tmp/supabase-src
cp /tmp/supabase-src/docker/volumes/db/*.sql ./volumes/db/init/
# Confira que os nomes não colidem com 00-extensions.sql (renomeie se
# necessário — a ordem de execução é alfabética) e que a versão do clone
# é compatível com as tags de imagem fixadas no docker-compose.yml deste
# diretório (supabase/gotrue, postgrest, realtime, storage-api, etc.).
```

Depois disso, sim: `docker compose up -d` cria o banco do zero com todos os
roles/schemas certos, e a Fase 2 do plano (aplicar as migrations do repo)
pode rodar em cima.
