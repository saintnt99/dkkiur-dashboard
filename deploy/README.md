# Деплой на свой VPS (Ubuntu 22+/24+)

Однокомандный self-hosted: FastAPI + React + Postgres + Caddy (автоматический HTTPS через Let's Encrypt) в Docker Compose.

## Зачем

Render заблокирован корпоративным фаерволом? Размещаем на VPS в РФ под своим доменом — СБ доволен, latency лучше, контроль полный.

## Что нужно

- Ubuntu 22.04+/24.04+ с root SSH-доступом
- Открытые порты `80` и `443` (Caddy сам получит TLS-сертификат)
- Домен, направленный на IP VPS (если ещё нет — можно сразу `<IP>.sslip.io`)

## Первая установка (5 минут)

```bash
ssh root@5.42.113.80
# (или твой IP)

# Скачиваем installer
curl -fsSL https://raw.githubusercontent.com/saintnt99/dkkiur-dashboard/main/deploy/install.sh -o /tmp/install.sh
bash /tmp/install.sh
# Установит Docker, склонирует репо в /opt/dkkiur, создаст /opt/dkkiur/deploy/.env с авто-секретами.

# Редактируем .env — задаём SITE_PASSWORD и DOMAIN
nano /opt/dkkiur/deploy/.env

# Стартуем
bash /opt/dkkiur/deploy/start.sh
```

Caddy получит SSL-сертификат от Let's Encrypt автоматом (нужен публичный DNS на твой IP — sslip.io подходит).

## Обновление

```bash
bash /opt/dkkiur/deploy/update.sh
```

Делает `git pull` + пересборку. Миграции БД накатываются автоматически (alembic в entrypoint).

## Ежедневный бэкап БД

```bash
crontab -e
# добавь строку:
0 3 * * * /opt/dkkiur/deploy/backup.sh >> /var/log/dkkiur-backup.log 2>&1
```

Бэкапы пишутся в `/var/backups/dkkiur/`, старше 30 дней — удаляются.

## Восстановление из бэкапа

```bash
gunzip -c /var/backups/dkkiur/dump-20260615-030000.sql.gz | \
  docker compose -f /opt/dkkiur/deploy/docker-compose.prod.yml exec -T db \
  psql -U dashboard -d dashboard
```

## Полезные команды

```bash
cd /opt/dkkiur/deploy
docker compose -f docker-compose.prod.yml ps               # статус сервисов
docker compose -f docker-compose.prod.yml logs -f api      # стрим логов
docker compose -f docker-compose.prod.yml restart api      # рестарт после правок
docker compose -f docker-compose.prod.yml down             # стоп (volume сохраняется)
docker compose -f docker-compose.prod.yml down -v          # ОПАСНО: удалит volume с БД
```

## Файлы

- `docker-compose.prod.yml` — описание стека (api + db + caddy)
- `Caddyfile` — конфиг прокси с автоматическим TLS
- `.env.example` — шаблон секретов
- `install.sh` — первичная установка (Docker + клон репо + .env)
- `start.sh` — сборка и запуск
- `update.sh` — git pull + пересборка
- `backup.sh` — ежедневный pg_dump

## Если домена нет и не хочется покупать

Используй `sslip.io` — бесплатный wildcard DNS, который резолвится в IP из имени:

```
DOMAIN=5.42.113.80.sslip.io
```

Caddy получит на это валидный Let's Encrypt сертификат.
