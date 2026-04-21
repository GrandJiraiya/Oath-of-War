from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
def _normalize_postgres_scheme(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url
def build_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return _normalize_postgres_scheme(explicit)
    supabase_url = os.getenv("SUPABASE_DB_URL")
    if supabase_url:
        return _normalize_postgres_scheme(supabase_url)
    return f"sqlite:///{BASE_DIR / 'local.db'}"
class Settings:
    APP_NAME = "Oath of War"
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    DATABASE_URL = build_database_url()
