#!/bin/bash
# =============================================================================
# uPixel CRM — Fix de Produção
# Corrige conectividade de rede, CMD do container e nginx em uma execução.
# Execute na VPS: bash /docker/upixel/deploy/fix-production.sh
# =============================================================================
set -e

APP_DIR="/docker/upixel"
COMPOSE_DIR="/docker/compose"
CONTAINER="upixel-api"
NGINX_CONTAINER="nginx-totum"
NETWORK="compose_totum"
NGINX_CONF_DST="$COMPOSE_DIR/nginx.conf"
NGINX_CONF_SRC="$APP_DIR/deploy/nginx.conf"
OVERRIDE_FILE="$COMPOSE_DIR/docker-compose.override.yml"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

echo "============================================"
echo " uPixel CRM — Fix de Produção"
echo "============================================"
echo ""

# ----------------------------------------------------------------
# FASE 1: Diagnóstico
# ----------------------------------------------------------------
echo "[ FASE 1 ] Diagnóstico"
echo ""

UPIXEL_IP=$(docker inspect "$CONTAINER" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' 2>/dev/null | awk '{print $1}')
UPIXEL_NETS=$(docker inspect "$CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)
NGINX_NETS=$(docker inspect "$NGINX_CONTAINER" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)
NET_INTERNAL=$(docker network inspect "$NETWORK" --format '{{.Internal}}' 2>/dev/null || echo "unknown")
UPIXEL_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")

echo "  upixel-api:"
echo "    Status:   $UPIXEL_STATUS"
echo "    IP:       ${UPIXEL_IP:-n/a}"
echo "    Networks: $UPIXEL_NETS"
echo ""
echo "  nginx-totum:"
echo "    Networks: $NGINX_NETS"
echo ""
echo "  $NETWORK internal: $NET_INTERNAL"
echo ""

# Teste de conectividade nginx → upixel-api
echo "  Testando proxy nginx → upixel-api:3000 ..."
PROXY_RESULT=$(docker exec "$NGINX_CONTAINER" wget -qO- --timeout=3 "http://$UPIXEL_IP:3000/" 2>&1 | head -1 || echo "TIMEOUT")
if echo "$PROXY_RESULT" | grep -qi "doctype\|html\|upixel"; then
  ok "Proxy funciona via IP direto ($UPIXEL_IP:3000)"
  PROXY_BY_IP=true
else
  warn "Proxy via IP falhou ($PROXY_RESULT)"
  PROXY_BY_IP=false
fi

DNS_RESULT=$(docker exec "$NGINX_CONTAINER" wget -qO- --timeout=3 "http://upixel-api:3000/" 2>&1 | head -1 || echo "TIMEOUT")
if echo "$DNS_RESULT" | grep -qi "doctype\|html\|upixel"; then
  ok "Proxy funciona via DNS (upixel-api:3000)"
  PROXY_BY_DNS=true
else
  warn "Proxy via DNS falhou ($DNS_RESULT)"
  PROXY_BY_DNS=false
fi
echo ""

# ----------------------------------------------------------------
# FASE 2: Corrigir rede (se necessário)
# ----------------------------------------------------------------
echo "[ FASE 2 ] Conectividade de rede"
echo ""

# 2a: Garantir upixel-api está na network compose_totum
if ! echo "$UPIXEL_NETS" | grep -q "$NETWORK"; then
  warn "upixel-api NÃO está na network $NETWORK — conectando..."
  docker network connect "$NETWORK" "$CONTAINER" 2>/dev/null && ok "Conectado a $NETWORK" || warn "Falhou ao conectar (talvez já esteja)"
else
  ok "upixel-api já está em $NETWORK"
fi

# 2b: Se network é internal, verificar comunicação direta
if [ "$NET_INTERNAL" = "true" ]; then
  warn "Network $NETWORK é INTERNAL (sem acesso externo)"
  echo "     Containers podem se comunicar entre si dentro desta rede."
fi

# 2c: Verificar iptables bloqueando porta 3000
echo ""
echo "  Verificando iptables (porta 3000)..."
IPTABLES_BLOCK=$(iptables -L DOCKER-USER -n 2>/dev/null | grep -E "DROP|REJECT" | head -5 || echo "")
if [ -n "$IPTABLES_BLOCK" ]; then
  warn "Regras DROP/REJECT encontradas em DOCKER-USER:"
  echo "$IPTABLES_BLOCK" | sed 's/^/     /'
  echo ""
  echo "  Adicionando regra ACCEPT para tráfego inter-container..."
  iptables -I DOCKER-USER -i "$NETWORK" -o "$NETWORK" -j ACCEPT 2>/dev/null && \
    ok "Regra adicionada" || warn "Não foi possível adicionar regra (pode precisar de root)"
else
  ok "Sem bloqueios iptables evidentes"
fi
echo ""

# 2d: Re-testar após correções
echo "  Re-testando proxy após correções de rede..."
NEW_PROXY=$(docker exec "$NGINX_CONTAINER" wget -qO- --timeout=3 "http://upixel-api:3000/" 2>&1 | head -1 || echo "TIMEOUT")
if echo "$NEW_PROXY" | grep -qi "doctype\|html\|upixel"; then
  ok "Proxy OK após correções"
  PROXY_FIXED=true
else
  warn "Proxy ainda falha — aplicando fallback estático no nginx"
  PROXY_FIXED=false
fi
echo ""

# ----------------------------------------------------------------
# FASE 3: Otimizar CMD do container (skip rebuild)
# ----------------------------------------------------------------
echo "[ FASE 3 ] Otimizar container upixel-api"
echo ""

CURRENT_CMD=$(docker inspect "$CONTAINER" --format='{{json .Config.Cmd}}' 2>/dev/null || echo "unknown")
echo "  CMD atual: $CURRENT_CMD"

if echo "$CURRENT_CMD" | grep -q "npm run build\|npm ci"; then
  warn "Container rebuilda a cada restart — isso causa 5-10 min de downtime"
  echo "     Criando docker-compose.override.yml para otimizar..."

  # Detectar onde está o docker-compose principal
  if [ -f "$COMPOSE_DIR/docker-compose.yml" ]; then
    COMPOSE_MAIN="$COMPOSE_DIR/docker-compose.yml"
  elif [ -f "/docker/docker-compose.yml" ]; then
    COMPOSE_MAIN="/docker/docker-compose.yml"
    COMPOSE_DIR="/docker"
    OVERRIDE_FILE="$COMPOSE_DIR/docker-compose.override.yml"
  else
    COMPOSE_MAIN=""
  fi

  if [ -n "$COMPOSE_MAIN" ]; then
    cat > "$OVERRIDE_FILE" << 'OVERRIDE'
# uPixel CRM — Override para deploy zero-downtime
# Remove npm ci + npm run build do CMD; a dist é fornecida
# pre-compilada pelo GitHub Actions via volume mount.
version: "3.8"
services:
  upixel-api:
    command: sh -c "cd /app && npm run preview"
    volumes:
      - /docker/upixel:/app
    networks:
      - compose_totum
OVERRIDE

    ok "docker-compose.override.yml criado em $OVERRIDE_FILE"
    echo ""
    echo "  Aplicando override (docker-compose up -d upixel-api)..."
    cd "$COMPOSE_DIR"
    docker-compose up -d --no-deps --build=false "$CONTAINER" 2>&1 | tail -5 && \
      ok "Container atualizado" || {
      warn "docker-compose falhou, tentando restart manual..."
      docker restart "$CONTAINER" 2>/dev/null && ok "Container reiniciado" || fail "Restart falhou"
    }

    echo ""
    echo "  Aguardando container ficar pronto (máx 60s)..."
    for i in $(seq 1 12); do
      sleep 5
      STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
      LOGS=$(docker logs "$CONTAINER" --tail=3 2>&1 | tr '\n' ' ')
      if echo "$LOGS" | grep -q "Local:"; then
        ok "Container pronto! ($((i*5))s)"
        break
      fi
      printf "    %ds — %s\n" "$((i*5))" "$(echo "$LOGS" | tail -c 100)"
      if [ $i -eq 12 ]; then warn "Container não ficou pronto em 60s"; fi
    done
  else
    warn "docker-compose.yml não encontrado. Override não criado."
    echo "     Adicione manualmente ao docker-compose do upixel-api:"
    echo "       command: sh -c \"cd /app && npm run preview\""
  fi
else
  ok "CMD já está otimizado (sem npm build)"
fi
echo ""

# ----------------------------------------------------------------
# FASE 4: Atualizar nginx config
# ----------------------------------------------------------------
echo "[ FASE 4 ] Atualizar nginx"
echo ""

if [ ! -f "$NGINX_CONF_SRC" ]; then
  warn "nginx.conf não encontrado em $NGINX_CONF_SRC — pulando"
else
  cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
  echo "  Config copiada para $NGINX_CONF_DST"

  if docker exec "$NGINX_CONTAINER" nginx -t 2>&1 | grep -q "successful"; then
    docker exec "$NGINX_CONTAINER" nginx -s reload
    ok "nginx recarregado com nova config"
  else
    NGINX_ERR=$(docker exec "$NGINX_CONTAINER" nginx -t 2>&1 | tail -5)
    fail "nginx -t falhou:"
    echo "$NGINX_ERR" | sed 's/^/     /'
    echo ""
    warn "Mantendo config anterior (site continua no ar)"
  fi
fi
echo ""

# ----------------------------------------------------------------
# FASE 5: Sincronizar dist
# ----------------------------------------------------------------
echo "[ FASE 5 ] Sincronizar dist"
echo ""

DIST_PRIMARY="$APP_DIR/dist"
DIST_FALLBACK="/var/www/upixelcrm/dist"

if [ -d "$DIST_PRIMARY" ]; then
  BUNDLE=$(ls "$DIST_PRIMARY/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
  ok "dist primary: $BUNDLE"

  # Sincroniza fallback com primary
  if ! diff -rq "$DIST_PRIMARY" "$DIST_FALLBACK" >/dev/null 2>&1; then
    echo "  Sincronizando fallback estático..."
    mkdir -p "$DIST_FALLBACK"
    rsync -a --delete "$DIST_PRIMARY/" "$DIST_FALLBACK/"
    ok "dist fallback sincronizado"
  else
    ok "dist fallback já está em sync"
  fi
else
  warn "dist primary não encontrada em $DIST_PRIMARY"
fi
echo ""

# ----------------------------------------------------------------
# FASE 6: Verificação final
# ----------------------------------------------------------------
echo "[ FASE 6 ] Verificação final"
echo ""

# Site responde?
SITE_CHECK=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "ERR")
if [ "$SITE_CHECK" = "200" ]; then
  ok "upixel-api:3000 responde HTTP 200"
else
  warn "upixel-api:3000 retornou: $SITE_CHECK"
fi

# Proxy nginx → container?
FINAL_PROXY=$(docker exec "$NGINX_CONTAINER" wget -qO- --timeout=3 "http://upixel-api:3000/" 2>&1 | head -1 || echo "TIMEOUT")
if echo "$FINAL_PROXY" | grep -qi "doctype\|html"; then
  ok "Proxy nginx → upixel-api: OK"
else
  warn "Proxy nginx → upixel-api: ainda falha ($FINAL_PROXY)"
  echo "     nginx usará fallback estático — site continua no ar"
fi

# nginx carregou a config nova?
NGINX_UPIXEL=$(docker exec "$NGINX_CONTAINER" nginx -T 2>/dev/null | grep -c "upixel_backend\|upixel-api" || echo 0)
if [ "$NGINX_UPIXEL" -gt 0 ]; then
  ok "nginx carregou config com proxy upixel"
else
  warn "nginx config pode estar desatualizada"
fi

echo ""
echo "============================================"
echo " RESULTADO"
echo "============================================"
BUNDLE_PRIMARY=$(ls "$DIST_PRIMARY/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
BUNDLE_FALLBACK=$(ls "$DIST_FALLBACK/assets/index-"*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "?")
echo "  Bundle ativo (primary):  $BUNDLE_PRIMARY"
echo "  Bundle ativo (fallback): $BUNDLE_FALLBACK"
CONTAINER_FINAL=$(docker inspect --format='{{.State.Status}} / health:{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "?")
echo "  Container: $CONTAINER_FINAL"
echo ""
echo "  Para diagnosticar mais:"
echo "    docker logs $CONTAINER --tail 20"
echo "    docker exec $NGINX_CONTAINER nginx -T | grep upixel"
echo "    curl -I http://localhost:3000/"
echo ""
echo "  Fix de produção concluído."
