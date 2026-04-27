#!/bin/bash
set -e

# Deploy do uPixel CRM com dist pré-compilada (build feito no GitHub Actions).
# Recebe o caminho do diretório com dist/ + deploy/ extraídos como primeiro argumento.
# Faz atomic swap do diretório dist + restart do container → downtime mínimo.

EXTRACT_DIR="${1:-/tmp/upixel-extract}"
APP_DIR="/docker/upixel"
CONTAINER="upixel-api"
DIST_CURRENT="$APP_DIR/dist"
DIST_NEW="$APP_DIR/dist.new"
DIST_OLD="$APP_DIR/dist.old"
NGINX_CONF_SRC="$EXTRACT_DIR/deploy/nginx.conf"
NGINX_CONF_DST="/docker/compose/nginx.conf"

if [ ! -d "$EXTRACT_DIR/dist" ]; then
  echo "ERRO: dist não encontrada em $EXTRACT_DIR/dist"
  echo "      Esse script espera receber dist pré-compilada do GitHub Actions."
  exit 1
fi

echo "=== uPixel CRM Deploy ==="
echo "Origem:    $EXTRACT_DIR/dist"
echo "Destino:   $DIST_CURRENT"
NEW_BUNDLE=$(ls "$EXTRACT_DIR/dist/assets/index-"*.js 2>/dev/null | head -1)
echo "Bundle novo: $NEW_BUNDLE"

echo ""
echo "[1/5] Sincronizando código fonte..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin main 2>/dev/null && git reset --hard origin/main 2>/dev/null && \
    echo "      HEAD: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%s)" || \
    echo "      ⚠ git sync falhou (não crítico — dist é o que importa)"
fi

echo ""
echo "[2/5] Copiando dist nova para staging..."
rm -rf "$DIST_NEW"
cp -r "$EXTRACT_DIR/dist" "$DIST_NEW"
echo "      OK ($(du -sh "$DIST_NEW" | cut -f1))"

echo ""
echo "[3/5] Atomic swap..."
rm -rf "$DIST_OLD"
if [ -d "$DIST_CURRENT" ]; then
  mv "$DIST_CURRENT" "$DIST_OLD"
fi
mv "$DIST_NEW" "$DIST_CURRENT"
echo "      OK"

echo ""
echo "[4/5] Atualizando nginx config..."
if [ -f "$NGINX_CONF_SRC" ] && [ -d "$(dirname "$NGINX_CONF_DST")" ]; then
  cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
  if docker exec nginx-totum nginx -t 2>/dev/null; then
    docker exec nginx-totum nginx -s reload
    echo "      nginx recarregado"
  else
    echo "      ⚠ nginx -t falhou — config não recarregada"
  fi
else
  echo "      nginx config ou destino não encontrado, pulando"
fi

echo ""
echo "[5/5] Container upixel-api..."
# IMPORTANTE: por padrão NÃO reiniciamos o container.
# Motivo: o CMD do container roda `npm ci && npm run build && npm run preview`,
# que leva 5-10 minutos e causa downtime/504. A dist já vem pronta do GitHub
# Actions e nginx serve diretamente do volume /docker/upixel/dist — restart
# só é necessário se o container tem a dist EMBUTIDA (não montada como volume).
#
# Para forçar restart (caso a arquitetura precise): RESTART_CONTAINER=1 bash deploy.sh
if [ "${RESTART_CONTAINER:-0}" = "1" ]; then
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
    docker restart "$CONTAINER" >/dev/null
    echo "      Container reiniciado (RESTART_CONTAINER=1)"
  else
    echo "      Container $CONTAINER não encontrado"
  fi
else
  echo "      Restart pulado (default). Use RESTART_CONTAINER=1 para forçar."
fi

# Limpa dist.old em background (não bloqueia o deploy)
( rm -rf "$DIST_OLD" 2>/dev/null & )

echo ""
echo "=== Deploy concluído ==="
BUNDLE=$(ls "$DIST_CURRENT/assets/index-"*.js 2>/dev/null | head -1)
if [ -n "$BUNDLE" ]; then
  echo "Bundle ativo: $BUNDLE"
fi
