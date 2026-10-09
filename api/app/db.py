from sqlmodel import create_engine
from app.config import settings


def _engine_kwargs(url: str):
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


engine = create_engine(settings.DATABASE_URL, **_engine_kwargs(settings.DATABASE_URL))
