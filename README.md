# Oath of War — Flask Backend + Web Frontend

This repository contains the game API backend, database models, and bundled web UI.

## Project structure

```text
.
├── app.py                     # Root runtime entrypoint for Flask
├── oath_of_war/
│   ├── __init__.py            # Exposes `app` for Flask (`flask --app oath_of_war run`)
│   ├── app.py                 # Flask app factory and API routes
│   ├── config.py              # Environment + DB URL configuration
│   ├── db.py                  # SQLAlchemy engine/session/base
│   ├── models.py              # Player/Run/SaveSlot ORM models
│   ├── repository.py          # Data-access and leaderboard/save logic
│   └── web/
│       ├── static/            # Frontend JS/CSS
│       └── templates/         # Flask HTML templates
├── scripts/
│   └── init_db.py             # Local database bootstrap script
├── schema.sql                 # SQL schema reference
└── supabase/migrations/        # Supabase SQL migration history
```

## Quick start locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # if present
python scripts/init_db.py
python -m flask --app oath_of_war run --host=0.0.0.0 --port=8000
```

Alternative entrypoint:

```bash
python app.py
```

## Environment variables

### Local SQLite

```env
FLASK_SECRET_KEY=change-me
DATABASE_URL=sqlite:///local.db
```

### Supabase on Vercel

```env
FLASK_SECRET_KEY=change-me
DATABASE_URL=postgresql://YOUR_TRANSACTION_POOLER_CONNECTION_STRING
```

Optional equivalent variable name:

```env
SUPABASE_DB_URL=postgresql://YOUR_TRANSACTION_POOLER_CONNECTION_STRING
```

## API routes

- `GET /api/health`
- `POST /api/player/register`
- `GET /api/player/<player_name>`
- `GET /api/leaderboard`
- `POST /api/run/submit`
- `POST /api/save-slot`
- `GET /api/save-slot/<player_name>`

## Notes

- Root compatibility shims (`config.py`, `db.py`, `models.py`, `repository.py`) are still present, but main development should happen in `oath_of_war/`.
