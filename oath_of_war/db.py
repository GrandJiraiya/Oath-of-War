from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from oath_of_war.config import Settings

connect_args = {'check_same_thread': False} if Settings.DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(Settings.DATABASE_URL, future=True, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()
