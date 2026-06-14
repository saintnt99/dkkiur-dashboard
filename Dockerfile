# syntax=docker/dockerfile:1.6

# ---- frontend build ----
FROM node:20-alpine AS frontend-build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- backend (dev base) ----
FROM python:3.12-slim AS backend-dev
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ---- prod (default) ----
FROM backend-dev AS prod
COPY --from=frontend-build /fe/dist /app/static
ENV SERVE_STATIC=1 COOKIE_SECURE=1
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]
