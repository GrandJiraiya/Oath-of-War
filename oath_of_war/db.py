from __future__ import annotations
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from oath_of_war.config import Settings
is_sqlite = Settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {
    "future": True,
    "pool_pre_ping": True,
}
if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["poolclass"] = NullPool
engine = create_engine(Settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
)
Base = declarative_base()
