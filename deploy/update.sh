#!/bin/bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/dkkiur}"
cd "$APP_DIR"
git fetch --all
git reset --hard origin/main
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
echo "==> Обновлено."
