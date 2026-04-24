#!/bin/bash
set -e

# Carrega nvm para shells não-interativos (GitHub Actions SSH)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh" --no-use
  nvm use --lts 2>/dev/null || nvm use node 2>/dev/null || true
fi

# Fallback: busca npm em locais comuns se ainda não estiver no PATH
if ! command -v npm &>/dev/null; then
  NPM_BIN=$(find /root/.nvm/versions /usr/local/bin /usr/bin -name "npm" 2>/dev/null | head -1)
  [ -n "$NPM_BIN" ] && export PATH="$(dirname "$NPM_BIN"):$PATH"
fi

APP_DIR="/var/www/upixelcrm"
NGINX_CONF_SRC="$APP_DIR/deploy/nginx.conf"
NGINX_CONF_DST="/docker/compose/nginx.conf"

echo "=== uPixel CRM Deploy ==="
echo "Node: $(node --version 2>/dev/null || echo 'não encontrado')"
echo "npm:  $(npm --version 2>/dev/null || echo 'não encontrado')"

echo "[1/5] Pulling latest code..."
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

echo "[2/5] Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install

echo "[3/5] Building application..."
npm run build

echo "[4/5] Updating nginx config..."
cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"

echo "[5/5] Reloading nginx..."
docker exec nginx-totum nginx -t && docker exec nginx-totum nginx -s reload

echo "=== Deploy concluído ==="
echo "Dist: $(du -sh $APP_DIR/dist | cut -f1) | $(ls $APP_DIR/dist | wc -l) arquivos"
