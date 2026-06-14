# Дашборд ДККиУР

Веб-дашборд для руководителя ДККиУР: 5 страниц (Качество, События, Моральный климат, Проблемные мероприятия, Календарь совещаний). Данные импортируются из xlsx и редактируются в UI. Доступ — по общему паролю.

## Стек

- **Фронт**: React 18 + Vite + TypeScript + Recharts
- **Бэк**: FastAPI + SQLAlchemy 2 + Alembic
- **БД**: PostgreSQL 16
- **Деплой**: один Docker-контейнер на Render Web Service + Render Postgres

## Локальный запуск

```bash
cp .env.example .env  # заполнить SITE_PASSWORD и JWT_SECRET
docker compose up --build
# Фронт dev: cd frontend && npm install && npm run dev → http://localhost:5173
# Бэк: http://localhost:8000/api, документация — /api/docs
```

В проде FastAPI отдаёт собранный фронт из `backend/static/`.

## Структура

```
dashboard/
├── frontend/        # Vite + React (страницы, компоненты, стили)
├── backend/         # FastAPI (роутеры, модели, парсеры xlsx)
├── Dockerfile       # multi-stage: build фронта → копия в FastAPI /static
├── docker-compose.yml
└── render.yaml      # blueprint для Render
```

## Render Free — ограничения

| Что | Почему важно |
|---|---|
| Web Service засыпает через 15 мин неактивности | Первый запрос ~30 сек |
| Free Postgres живёт 30 дней | Перед прод-нагрузкой апгрейдим |
| 512 МБ RAM | Следим за размером xlsx при импорте |
| Нет persistent disk | Загруженные xlsx не сохраняем, только парсим |

## Импорт xlsx

На каждой странице (кроме календаря) — кнопка «Загрузить xlsx». Бэк парсит, возвращает diff, пользователь подтверждает применение. Журнал импортов — `import_log` в БД.
