#!/bin/bash
# Ежедневный бэкап БД. Можно прицепить в cron.
# Пример cron (от root): 0 3 * * * /opt/dkkiur/deploy/backup.sh >> /var/log/dkkiur-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/dkkiur}"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/dump-$TS.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U dashboard -d dashboard --no-owner --clean --if-exists | gzip > "$FILE"

# Чистим бэкапы старше 30 дней
find "$BACKUP_DIR" -name 'dump-*.sql.gz' -mtime +30 -delete

echo "Бэкап: $FILE ($(du -h "$FILE" | cut -f1))"
