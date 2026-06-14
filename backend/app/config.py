from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_db_url(url: str) -> str:
    """Render/Neon/Heroku отдают postgres:// или postgresql:// — приводим к psycopg-формату."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+psycopg" not in url and "+asyncpg" not in url:
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://dashboard:dashboard@localhost:5432/dashboard"
    site_password: str = "dev"
    jwt_secret: str = "dev-secret-change-me"
    jwt_ttl_days: int = 30
    cors_origins: str = "http://localhost:5173"
    serve_static: bool = False
    cookie_secure: bool = False  # включить в проде (HTTPS)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def db_url(self) -> str:
        return _normalize_db_url(self.database_url)


settings = Settings()
