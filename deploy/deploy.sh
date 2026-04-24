#!/bin/bash
set -e

APP_DIR="/var/www/upixelcrm"
DIST_DIR="$APP_DIR/dist"
NGINX_CONF_SRC="$APP_DIR/deploy/nginx.conf"
NGINX_CONF_DST="/docker/compose/nginx.conf"

echo "=== uPixel CRM Deploy ==="
echo "[1/5] Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "[2/5] Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install

echo "[3/5] Building application..."
npm run build

echo "[4/5] Updating nginx config..."
cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"

echo "[5/5] Reloading nginx..."
docker exec nginx-totum nginx -t && docker exec nginx-totum nginx -s reload

echo "=== Deploy concluído ==="
echo "Dist: $(du -sh $DIST_DIR | cut -f1) | $(ls $DIST_DIR | wc -l) arquivos"
