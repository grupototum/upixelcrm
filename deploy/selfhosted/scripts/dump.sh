#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════
# dump.sh — RASCUNHO, NÃO EXECUTADO. Prepara o dump de dados do projeto
# cloud (Fase 3 do plano — ensaio, cloud continua sendo produção).
#
# [OPERADOR]: revisar linha a linha antes de rodar. Requer:
#   - CLOUD_DB_URL: connection string do Postgres do cloud (Project
#     Settings → Database → Connection string, modo "Session" ou
#     "Transaction" — NÃO commitar isso em lugar nenhum, exportar só na
#     shell de quem for rodar).
#   - pg_dump instalado (versão compatível com o Postgres do cloud, hoje
#     15.x — `pg_dump --version` para conferir antes).
#
# Uso:
#   export CLOUD_DB_URL="postgres://postgres:SENHA@db.xusdhzwfkzufupjwbebt.supabase.co:5432/postgres"
#   ./dump.sh
# ════════════════════════════════════════════════════════════════════════

set -euo pipefail

: "${CLOUD_DB_URL:?defina CLOUD_DB_URL antes de rodar (connection string do cloud, nunca commitar)}"

OUT_DIR="${OUT_DIR:-./dump-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

echo "==> Dump de schema (já deveria bater com supabase/migrations/ — Fase 0/2)"
pg_dump "$CLOUD_DB_URL" \
  --schema-only --no-owner --no-privileges \
  -f "$OUT_DIR/schema-cloud.sql"

echo "==> Dump de dados — schemas public, auth, storage"
# --data-only + schema já aplicado na VPS (Fase 2) é o caminho mais seguro:
# evita conflito de ordem de criação de tipos/extensões entre cloud e VPS.
pg_dump "$CLOUD_DB_URL" \
  --data-only --no-owner \
  --schema=public --schema=auth --schema=storage \
  --exclude-table-data='auth.audit_log_entries' \
  -f "$OUT_DIR/data-cloud.sql"

echo "==> Contagem de linhas das tabelas principais (conferência pós-restore)"
psql "$CLOUD_DB_URL" -c "
  select 'profiles' as tbl, count(*) from public.profiles
  union all select 'tenants', count(*) from public.tenants
  union all select 'organizations', count(*) from public.organizations
  union all select 'leads', count(*) from public.leads
  union all select 'conversations', count(*) from public.conversations
  union all select 'messages', count(*) from public.messages;
" | tee "$OUT_DIR/row-counts.txt"

echo "==> Feito. Arquivos em: $OUT_DIR"
echo "    Storage (arquivos, não linhas de DB) precisa de cópia à parte —"
echo "    ver nota no README.md sobre rclone / API de storage (ainda não"
echo "    escrito nesta sessão — depende de decidir o backend de Storage"
echo "    real vs o 'file' backend usado neste docker-compose.yml)."
