#!/bin/bash
# deploy-local.sh — wrapper pra `npm run deploy` (e `npm run ship` que combina build + deploy).
# Empacota dist/ + deploy/, envia pro VPS via scp, e roda o deploy.sh remoto.
# Falha cedo (set -e) se qualquer step quebrar.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TARBALL="/tmp/upixel-deploy.tar.gz"
SSH_KEY="${UPIXEL_SSH_KEY:-$HOME/.ssh/totum_vps_ed25519}"
SSH_HOST="${UPIXEL_SSH_HOST:-totum-vps}"

if [ ! -d "dist" ]; then
  echo "❌ Pasta dist/ não existe. Rode 'npm run build' antes (ou use 'npm run ship')."
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key não encontrada em $SSH_KEY"
  echo "   Override via env: UPIXEL_SSH_KEY=/path/to/key npm run deploy"
  exit 1
fi

echo "📦 Empacotando dist/ + deploy/ → $TARBALL"
tar -czf "$TARBALL" dist/ deploy/
du -h "$TARBALL" | cut -f1 | xargs -I{} echo "   Tamanho: {}"

echo "🚀 Enviando para $SSH_HOST..."
scp -O -i "$SSH_KEY" -o ConnectTimeout=30 "$TARBALL" "$SSH_HOST:/tmp/"

echo "🛠  Rodando deploy.sh remoto..."
ssh -i "$SSH_KEY" "$SSH_HOST" "rm -rf /tmp/upixel-extract && \
  mkdir -p /tmp/upixel-extract && \
  tar -xzf /tmp/upixel-deploy.tar.gz -C /tmp/upixel-extract 2>&1 | grep -v 'LIBARCHIVE.xattr' && \
  bash /tmp/upixel-extract/deploy/deploy.sh /tmp/upixel-extract"

echo ""
echo "✅ Deploy concluído. Faça hard refresh (Cmd+Shift+R) em https://totum.upixel.app"
