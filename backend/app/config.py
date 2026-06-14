from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://dashboard:dashboard@localhost:5432/dashboard"
    site_password: str = "dev"
    jwt_secret: str = "dev-secret-change-me"
    jwt_ttl_days: int = 30
    cors_origins: str = "http://localhost:5173"
    serve_static: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
