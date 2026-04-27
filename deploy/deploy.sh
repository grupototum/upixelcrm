#!/bin/bash
set -e

# Deploy do uPixel CRM com dist pré-compilada (build feito no GitHub Actions).
# Recebe o caminho do diretório extraído como primeiro argumento.
#
# Arquitetura de deploy:
#   - /docker/upixel/dist  → montado como /app/dist no upixel-api (vite preview)
#   - /var/www/upixelcrm/dist → nginx fallback estático (via volume no nginx-totum)
# Ambos são atualizados com a mesma dist para garantir consistência.

EXTRACT_DIR="${1:-/tmp/upixel-extract}"
APP_DIR="/docker/upixel"
CONTAINER="upixel-api"
NGINX_CONF_SRC="$EXTRACT_DIR/deploy/nginx.conf"
NGINX_CONF_DST="/docker/compose/nginx.conf"

# Paths de dist (ambos recebem o mesmo conteúdo)
DIST_PRIMARY="$APP_DIR/dist"            # upixel-api container (vite preview)
DIST_FALLBACK="/var/www/upixelcrm/dist" # nginx static fallback

if [ ! -d "$EXTRACT_DIR/dist" ]; then
  echo "ERRO: dist não encontrada em $EXTRACT_DIR/dist"
  echo "      Esse script espera receber dist pré-compilada do GitHub Actions."
  exit 1
fi

NEW_BUNDLE=$(ls "$EXTRACT_DIR/dist/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "desconhecido")
echo "=== uPixel CRM Deploy ==="
echo "Bundle novo: $NEW_BUNDLE"
echo "Destinos:    $DIST_PRIMARY | $DIST_FALLBACK"

# ---------- [1/5] Sync código fonte (referência) ----------
echo ""
echo "[1/5] Sincronizando código fonte..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null && \
    echo "      HEAD: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)" || \
    echo "      ⚠ git sync falhou (não crítico — a dist compilada é o que importa)"
fi

# ---------- [2/5] Atomic swap — dist primary (upixel-api) ----------
echo ""
echo "[2/5] Atualizando dist primary ($DIST_PRIMARY)..."
rm -rf "${DIST_PRIMARY}.new"
cp -r "$EXTRACT_DIR/dist" "${DIST_PRIMARY}.new"
rm -rf "${DIST_PRIMARY}.old"
[ -d "$DIST_PRIMARY" ] && mv "$DIST_PRIMARY" "${DIST_PRIMARY}.old"
mv "${DIST_PRIMARY}.new" "$DIST_PRIMARY"
( rm -rf "${DIST_PRIMARY}.old" 2>/dev/null & )
find "$DIST_PRIMARY" -type d -exec chmod 755 {} + 2>/dev/null
find "$DIST_PRIMARY" -type f -exec chmod 644 {} + 2>/dev/null
echo "      OK ($(du -sh "$DIST_PRIMARY" | cut -f1))"

# ---------- [3/5] Atomic swap — dist fallback (nginx static) ----------
echo ""
echo "[3/5] Atualizando dist fallback ($DIST_FALLBACK)..."
mkdir -p "$(dirname "$DIST_FALLBACK")"
rm -rf "${DIST_FALLBACK}.new"
cp -r "$EXTRACT_DIR/dist" "${DIST_FALLBACK}.new"
rm -rf "${DIST_FALLBACK}.old"
[ -d "$DIST_FALLBACK" ] && mv "$DIST_FALLBACK" "${DIST_FALLBACK}.old"
mv "${DIST_FALLBACK}.new" "$DIST_FALLBACK"
( rm -rf "${DIST_FALLBACK}.old" 2>/dev/null & )
find "$DIST_FALLBACK" -type d -exec chmod 755 {} + 2>/dev/null
find "$DIST_FALLBACK" -type f -exec chmod 644 {} + 2>/dev/null
echo "      OK ($(du -sh "$DIST_FALLBACK" | cut -f1))"

# ---------- [4/5] nginx config + reload ----------
echo ""
echo "[4/5] Atualizando nginx config..."
if [ -f "$NGINX_CONF_SRC" ] && [ -d "$(dirname "$NGINX_CONF_DST")" ]; then
  cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
  if docker exec nginx-totum nginx -t 2>&1 | grep -q "test is successful"; then
    docker exec nginx-totum nginx -s reload
    echo "      nginx recarregado com nova config"
  else
    NGINX_ERR=$(docker exec nginx-totum nginx -t 2>&1 | tail -3)
    echo "      ⚠ nginx -t falhou, mantendo config anterior:"
    echo "        $NGINX_ERR"
  fi
else
  echo "      Destino $NGINX_CONF_DST não encontrado — pulando"
fi

# ---------- [5/5] Container status ----------
echo ""
echo "[5/5] Status do container..."
CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}} (health: {{.State.Health.Status}})' "$CONTAINER" 2>/dev/null || echo "não encontrado")
echo "      upixel-api: $CONTAINER_STATUS"
echo ""
echo "      Nota: dist atualizada em $DIST_PRIMARY (montada no container)."
echo "      vite preview serve os novos arquivos sem restart."
echo "      Se quiser forçar restart: RESTART_CONTAINER=1 bash $0 ..."
if [ "${RESTART_CONTAINER:-0}" = "1" ]; then
  docker restart "$CONTAINER" >/dev/null 2>&1 && echo "      Container reiniciado." || echo "      ⚠ Restart falhou."
fi

# ---------- Verificação final ----------
echo ""
echo "=== Deploy concluído ==="
ACTIVE_BUNDLE=$(ls "$DIST_PRIMARY/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
FALLBACK_BUNDLE=$(ls "$DIST_FALLBACK/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
echo "Bundle em primary:  $ACTIVE_BUNDLE"
echo "Bundle em fallback: $FALLBACK_BUNDLE"
if [ "$ACTIVE_BUNDLE" = "$FALLBACK_BUNDLE" ] && [ "$ACTIVE_BUNDLE" != "?" ]; then
  echo "✓ Ambos os caminhos estão em sync com o bundle novo"
else
  echo "⚠ Divergência entre primary e fallback — investigar"
fi
