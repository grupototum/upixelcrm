#!/bin/bash
set -e

# Deploy do uPixel CRM rodando em container Docker.
# O container `upixel-api` tem CMD que executa `npm ci --include=dev && npm run build && npm run preview`,
# então um `docker restart` rebuilda automaticamente a partir do código atualizado em /docker/upixel.

APP_DIR="/docker/upixel"
CONTAINER="upixel-api"
NGINX_CONF_SRC="$APP_DIR/deploy/nginx.conf"
NGINX_CONF_DST="/docker/compose/nginx.conf"

echo "=== uPixel CRM Deploy ==="
echo "Branch alvo: main"
echo "Diretório:   $APP_DIR"
echo "Container:   $CONTAINER"

echo ""
echo "[1/4] Atualizando código..."
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
echo "      HEAD: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%s)"

echo ""
echo "[2/4] Atualizando nginx config (se existir)..."
if [ -f "$NGINX_CONF_SRC" ] && [ -d "$(dirname "$NGINX_CONF_DST")" ]; then
  cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
  docker exec nginx-totum nginx -t 2>/dev/null && \
    docker exec nginx-totum nginx -s reload && \
    echo "      nginx recarregado"
else
  echo "      nginx config não encontrado, pulando"
fi

echo ""
echo "[3/4] Reiniciando container (rebuild automático)..."
docker restart "$CONTAINER" >/dev/null
echo "      Container reiniciado, aguardando build..."

echo ""
echo "[4/4] Aguardando container ficar saudável..."
for i in $(seq 1 60); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then
    echo "      ✓ Container saudável após ${i}0s"
    break
  fi
  sleep 10
  if [ $i -eq 60 ]; then
    echo "      ⚠ Container ainda não saudável após 10min, continuando mesmo assim"
  fi
done

echo ""
echo "=== Deploy concluído ==="
BUNDLE=$(docker exec "$CONTAINER" sh -c "ls /app/dist/assets/index-*.js 2>/dev/null | head -1" || echo "")
if [ -n "$BUNDLE" ]; then
  echo "Bundle ativo: $BUNDLE"
fi
