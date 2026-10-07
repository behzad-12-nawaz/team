from pydantic_settings import BaseSettings


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.split("://", 1)[1]
    return url


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dosecare.db"
    JWT_SECRET: str = "changeme"
    NOTIFIER: str = "console"
    BOT_URL: str = "http://localhost:8001"
    BOT_SERVICE_TOKEN: str = ""

    model_config = {"env_file": ".env"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.DATABASE_URL = _normalize_database_url(self.DATABASE_URL)


settings = Settings()
