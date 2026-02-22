#!/bin/bash
set -e

echo "=== Galgenspiel Deploy ==="

# Variáveis (ajustar conforme o servidor)
APP_DIR="/opt/galgenspiel"
WEB_DIR="/var/www/galgenspiel"
REPO_BRANCH="${1:-main}"
BACKEND_PORT="${BACKEND_PORT:-3077}"

# 1. Atualizar código
echo "[1/5] Pulling latest code..."
cd "$APP_DIR"
git pull origin "$REPO_BRANCH"

# 2. Build do frontend
echo "[2/5] Building frontend..."
cd "$APP_DIR/frontend"
npm ci --production=false
VITE_API_URL=/forca/api npm run build

# 3. Copiar build para diretório do nginx
echo "[3/5] Deploying static files..."
rm -rf "$WEB_DIR"
mkdir -p "$WEB_DIR"
cp -r dist/* "$WEB_DIR/"

# 4. Rebuild e restart dos containers
echo "[4/5] Restarting containers..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# 5. Health check
echo "[5/5] Health check..."
sleep 5
if curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" > /dev/null; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend not responding!"
    docker compose -f docker-compose.prod.yml logs backend --tail 30
    exit 1
fi

# Reload nginx (NÃO restart — não derruba outras apps)
echo "Reloading nginx..."
sudo nginx -t && sudo nginx -s reload

echo "=== Deploy complete ==="
echo "Verifique: curl https://seudominio.com/forca/"
echo "           curl https://seudominio.com/forca/api/health"
