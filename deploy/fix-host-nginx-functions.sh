#!/bin/bash
# deploy/fix-host-nginx-functions.sh
# Adiciona o bloco location /functions/v1/ na host nginx da VPS.
# Idempotente: verifica antes de editar. Valida com nginx -t antes de recarregar.
# Uso: bash deploy/fix-host-nginx-functions.sh
set -e

CONF="/etc/nginx/conf.d/domains/upixel.app.conf"
BACKUP="${CONF}.bak.$(date +%Y%m%d_%H%M%S)"

echo "=== [1/5] Config atual ==="
sudo cat "$CONF"

echo ""
echo "=== [2/5] Verificando se location /functions/v1/ já existe ==="
if sudo grep -q "location /functions/v1/" "$CONF"; then
  echo "  ✓ Bloco já existe — nada a fazer."
  exit 0
fi
echo "  Bloco não encontrado. Prosseguindo com inserção..."

echo ""
echo "=== [3/5] Criando backup em $BACKUP ==="
sudo cp "$CONF" "$BACKUP"
echo "  Backup criado."

echo ""
echo "=== [4/5] Inserindo bloco location /functions/v1/ antes de 'location /' ==="
# Usa Python para inserir o bloco de forma segura (sem regex frágil do sed).
sudo python3 - "$CONF" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

BLOCK = '''
        # Proxy reverso para Supabase Edge Functions.
        # Necessário para: Asaas webhook, Meta Data Deletion Callback,
        # e qualquer integração usando URL upixel.app/functions/v1/*
        location /functions/v1/ {
            resolver 1.1.1.1 8.8.8.8 valid=300s;
            set $supabase_functions "https://xusdhzwfkzufupjwbebt.supabase.co";

            proxy_pass         $supabase_functions$request_uri;
            proxy_http_version 1.1;
            proxy_ssl_server_name on;
            proxy_set_header   Host              xusdhzwfkzufupjwbebt.supabase.co;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_set_header   X-Forwarded-Host  $host;
            proxy_read_timeout 60s;
            proxy_connect_timeout 10s;
        }

'''

# Insere antes do primeiro "location /" (sem barra dupla) dentro do server block de upixel.app
# Usa marcador seguro: primeira ocorrência de "location /" que não seja parte de outro path
new_content = re.sub(
    r'(\s+)(location\s+/\s*\{)',
    lambda m: BLOCK + m.group(1) + m.group(2),
    content,
    count=1
)

if new_content == content:
    print("AVISO: padrão 'location /' não encontrado — config não alterada.")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(new_content)
print("  Bloco inserido com sucesso.")
PYEOF

echo ""
echo "=== [5/5] Validando nginx e recarregando ==="
if sudo nginx -t 2>&1; then
  sudo systemctl reload nginx
  echo "  ✓ nginx recarregado com sucesso."
else
  echo "  ✗ nginx -t FALHOU — revertendo para backup..."
  sudo cp "$BACKUP" "$CONF"
  echo "  Config revertida para $BACKUP"
  exit 1
fi

echo ""
echo "=== Verificação ==="
echo "Testando curl para asaas-webhook (espera 403 Forbidden do edge function):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST https://upixel.app/functions/v1/asaas-webhook \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "=== Concluído ==="
echo "  Se HTTP Status acima for 403 → fix aplicado com sucesso."
echo "  Se for 404/502/000 → investigar (chame o Rael antes de fazer mais mudanças)."
