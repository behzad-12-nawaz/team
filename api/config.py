from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dosecare.db"
    JWT_SECRET: str = "changeme"
    NOTIFIER: str = "console"
    BOT_URL: str = "http://localhost:8001"

    model_config = {"env_file": ".env"}


settings = Settings()
