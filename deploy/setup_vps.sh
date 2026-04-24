#!/bin/bash
# Run this ONCE on the VPS to wire up the static serving architecture.
# After this, /root/deploy_upixel.sh handles future deploys.
set -e

APP_DIR="/var/www/upixelcrm"
COMPOSE_FILE="/docker/compose/docker-compose.yml"

echo "=== uPixel CRM - VPS Setup ==="

# 1. Ensure app directory exists
echo "[1/6] Verificando diretório da aplicação..."
if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/grupototum/upixelcrm.git "$APP_DIR"
else
    echo "  Já existe: $APP_DIR"
fi

# 2. Build the app
echo "[2/6] Construindo a aplicação..."
cd "$APP_DIR"
git pull origin main
npm ci --prefer-offline 2>/dev/null || npm install
npm run build
echo "  Build em: $APP_DIR/dist"

# 3. Update nginx.conf
echo "[3/6] Atualizando nginx.conf..."
cp "$APP_DIR/deploy/nginx.conf" /docker/compose/nginx.conf
echo "  nginx.conf atualizado"

# 4. Add volume mount to docker-compose if not present
echo "[4/6] Verificando volume mount no docker-compose..."
if ! grep -q "upixelcrm/dist" "$COMPOSE_FILE" 2>/dev/null; then
    echo "  ATENÇÃO: Adicione manualmente ao nginx-totum em $COMPOSE_FILE:"
    echo ""
    echo "    volumes:"
    echo "      - /docker/compose/nginx.conf:/etc/nginx/nginx.conf:ro"
    echo "      - /var/www/upixelcrm/dist:/usr/share/nginx/html:ro"
    echo ""
    echo "  Depois rode: docker compose -f $COMPOSE_FILE up -d --force-recreate nginx-totum"
    echo ""
    read -p "Pressione Enter após editar o docker-compose.yml..."
fi

# 5. Recreate nginx container with new volume
echo "[5/6] Reiniciando nginx-totum com novo volume..."
cd /docker/compose
docker compose up -d --force-recreate nginx-totum

# 6. Kill vite preview if running
echo "[6/6] Parando vite preview (não mais necessário)..."
pkill -f "vite preview" 2>/dev/null && echo "  vite preview parado" || echo "  vite preview não estava rodando"

# 7. Update deploy script
echo "[7/7] Instalando novo script de deploy..."
cp "$APP_DIR/deploy/deploy.sh" /root/deploy_upixel.sh
chmod +x /root/deploy_upixel.sh

echo ""
echo "=== Setup concluído! ==="
echo "Testando nginx..."
sleep 2
curl -s -o /dev/null -w "upixel.app: %{http_code}\n" -H "Host: upixel.app" http://127.0.0.1:80/
curl -s -o /dev/null -w "ola.upixel.app: %{http_code}\n" -H "Host: ola.upixel.app" http://127.0.0.1:80/
echo ""
echo "Deploys futuros: /root/deploy_upixel.sh"
