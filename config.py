from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def build_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    turso_url = os.getenv("TURSO_DATABASE_URL")
    turso_token = os.getenv("TURSO_AUTH_TOKEN")
    if turso_url and turso_token:
        normalized = turso_url.replace("libsql://", "")
        return f"sqlite+libsql://{normalized}/?authToken={turso_token}&secure=true"

    return f"sqlite:///{BASE_DIR / 'local.db'}"


class Settings:
    APP_NAME = "Oath of War"
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    DATABASE_URL = build_database_url()
