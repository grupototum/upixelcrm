#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════
# restore.sh — RASCUNHO, NÃO EXECUTADO. Restaura o dump de dados
# (gerado por dump.sh) no Postgres self-hosted da VPS (Fase 3 — ensaio).
#
# Pré-requisito: schema já aplicado na VPS (Fase 2 do plano — migrations
# do repo + 9999_reconcile_drift.sql), senão o restore de dados falha por
# tabela inexistente.
#
# [OPERADOR]: revisar linha a linha antes de rodar. Requer:
#   - VPS_DB_URL: connection string do Postgres da VPS (dentro da rede
#     Docker ou via porta exposta — ver docker-compose.yml → service db).
#   - DUMP_DIR: pasta gerada por dump.sh (contém data-cloud.sql).
#
# Uso:
#   export VPS_DB_URL="postgres://postgres:SENHA@localhost:5432/postgres"
#   export DUMP_DIR="./dump-20260101-120000"
#   ./restore.sh
# ════════════════════════════════════════════════════════════════════════

set -euo pipefail

: "${VPS_DB_URL:?defina VPS_DB_URL antes de rodar (connection string da VPS)}"
: "${DUMP_DIR:?defina DUMP_DIR (pasta gerada por dump.sh)}"

if [ ! -f "$DUMP_DIR/data-cloud.sql" ]; then
  echo "ERRO: $DUMP_DIR/data-cloud.sql não encontrado — rode dump.sh primeiro." >&2
  exit 1
fi

echo "==> Restaurando dados em $VPS_DB_URL a partir de $DUMP_DIR/data-cloud.sql"
echo "    (isto ESCREVE no banco da VPS — confirme que é a VPS de ensaio,"
echo "     não produção, antes de continuar)"
read -r -p "Confirma? (digite 'sim' para continuar) " confirm
if [ "$confirm" != "sim" ]; then
  echo "Abortado."
  exit 1
fi

psql "$VPS_DB_URL" -v ON_ERROR_STOP=1 -f "$DUMP_DIR/data-cloud.sql"

echo "==> Conferindo contagem de linhas pós-restore"
psql "$VPS_DB_URL" -c "
  select 'profiles' as tbl, count(*) from public.profiles
  union all select 'tenants', count(*) from public.tenants
  union all select 'organizations', count(*) from public.organizations
  union all select 'leads', count(*) from public.leads
  union all select 'conversations', count(*) from public.conversations
  union all select 'messages', count(*) from public.messages;
"

echo "==> Comparar a saída acima com $DUMP_DIR/row-counts.txt (deve bater)."
echo "==> Próximo passo do plano (Fase 3): login de teste direto no GoTrue"
echo "    da VPS e confirmar RLS ativa (query anônima em leads retorna vazio)."
