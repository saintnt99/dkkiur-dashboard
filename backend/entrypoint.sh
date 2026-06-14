#!/bin/sh
set -e
# Применяем миграции при каждом запуске (если их нет — alembic просто проверит и завершит)
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
