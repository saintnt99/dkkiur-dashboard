#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Нет .env — сначала запусти install.sh"
  exit 1
fi

# Загружаем переменные чтобы valid-check работал
set -a
source .env
set +a

echo "==> Собираю и поднимаю стек (api + db + caddy) для домена: ${DOMAIN}"
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Логи api:"
docker compose -f docker-compose.prod.yml logs --tail=30 api

echo ""
echo "==> Готово. Открой:  https://${DOMAIN}"
echo "    Логин на сайт: SITE_PASSWORD из .env"
echo ""
echo "Полезное:"
echo "  docker compose -f deploy/docker-compose.prod.yml logs -f api    # стрим логов"
echo "  docker compose -f deploy/docker-compose.prod.yml restart api    # рестарт после правок"
echo "  docker compose -f deploy/docker-compose.prod.yml down -v        # ОПАСНО: убить + удалить volume"
