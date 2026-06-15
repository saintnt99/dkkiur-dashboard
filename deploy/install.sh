#!/bin/bash
set -euo pipefail

# Идемпотентный скрипт первичной установки на чистый Ubuntu 22+/24+.
# Запускать от root (или через sudo).

REPO_URL="${REPO_URL:-https://github.com/saintnt99/dkkiur-dashboard.git}"
APP_DIR="${APP_DIR:-/opt/dkkiur}"

echo "==> 1. apt update + установка зависимостей"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git ufw

if ! command -v docker >/dev/null 2>&1; then
  echo "==> 2. Устанавливаю Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "==> 2. Docker уже установлен — пропускаю"
fi

echo "==> 3. Открываю порты в файерволе (80, 443, SSH)"
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
echo "y" | ufw enable || true

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> 4. Клонирую репозиторий в $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> 4. Репозиторий уже есть — обновляю"
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" reset --hard origin/main
fi

cd "$APP_DIR/deploy"

if [ ! -f .env ]; then
  echo "==> 5. Создаю .env (нужно отредактировать перед первым запуском)"
  cp .env.example .env
  # Авто-генерация секретов
  JWT=$(openssl rand -hex 32)
  PGPW=$(openssl rand -hex 16)
  sed -i "s|replace-with-64-hex-chars|$JWT|" .env
  sed -i "s|replace-with-32-hex-chars|$PGPW|" .env
  echo ""
  echo "⚠️  Открой $APP_DIR/deploy/.env, проверь и поправь:"
  echo "    - SITE_PASSWORD (пароль на сайт, общий)"
  echo "    - DOMAIN (купленный домен или 5.42.113.80.sslip.io)"
  echo ""
  echo "Затем запусти: bash $APP_DIR/deploy/start.sh"
else
  echo "==> 5. .env уже есть"
fi

echo ""
echo "==> Установка завершена. Дальше:"
echo "   1. (если нужно) отредактируй $APP_DIR/deploy/.env"
echo "   2. Запусти $APP_DIR/deploy/start.sh"
