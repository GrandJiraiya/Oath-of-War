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

### Supabase on Vercel (recommended)

Use the **Supabase transaction pooler** URL (port `6543`) for Vercel/serverless deployments:

```env
FLASK_SECRET_KEY=your-long-random-secret
DATABASE_URL=postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
```

You can also use `SUPABASE_DB_URL` instead of `DATABASE_URL` (only one is required).

## Vercel deployment checklist (Supabase)

1. Open your Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add:
   - `FLASK_SECRET_KEY`
   - `DATABASE_URL` (or `SUPABASE_DB_URL`)
4. Paste your Supabase **transaction pooler** URL for the database variable.
5. Apply variable scope to:
   - **Production** (for `rpg.crashoutcrypto.xyz`)
   - **Preview** (recommended, so preview branches also connect correctly)
6. Remove old Turso variables if still present:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
7. Redeploy after variable changes (Vercel env var updates only apply to new deployments).

## Supabase sanity-test sequence

After redeploy, verify these endpoints in order:

1) **App health**

- `GET /api/health`
- Expected: `200` and `{"ok": true, "app": "Oath of War"}`

2) **Register player**

- `POST /api/player/register`
- Body:

```json
{
  "player_name": "Crash",
  "preferred_class": "rogue"
}
```

- Expected: `200` and player JSON.

3) **Submit run**

- `POST /api/run/submit`
- Body:

```json
{
  "run_id": "test-run-001",
  "player_name": "Crash",
  "class_key": "rogue",
  "room_reached": 3,
  "level_reached": 2,
  "victories": 2,
  "boss_kills": 0,
  "gold": 45,
  "score": 420,
  "run_over": false,
  "is_new_run": true
}
```

- Expected: `200`, updated player, and leaderboard array.

4) **Check leaderboard**

- `GET /api/leaderboard`
- Expected: submitted run appears in entries.

5) **Save cloud slot**

- `POST /api/save-slot`
- Body:

```json
{
  "player_name": "Crash",
  "payload": {
    "run_id": "test-run-001",
    "player": {
      "player_name": "Crash",
      "class_key": "rogue",
      "room": 3
    }
  }
}
```

- Expected: `200` and `{ "ok": true }`.

6) **Load cloud slot**

- `GET /api/save-slot/Crash`
- Expected: `200` and saved payload returned.

7) **Load player profile**

- `GET /api/player/Crash`
- Expected: `200` and player profile plus save slot.

## API routes

- `GET /api/health`
- `POST /api/player/register`
- `GET /api/player/<player_name>`
- `GET /api/leaderboard`
- `POST /api/run/submit`
- `POST /api/save-slot`
- `GET /api/save-slot/<player_name>`


## Manual curl checks

Use this sequence to smoke-test the deployed API:

```bash
BASE_URL="https://rpg.crashoutcrypto.xyz"

curl -i "$BASE_URL/api/health"

curl -i \
  -X POST "$BASE_URL/api/player/register" \
  -H "Content-Type: application/json" \
  -d '{
    "player_name": "Crash",
    "preferred_class": "rogue"
  }'

curl -i \
  -X POST "$BASE_URL/api/run/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-run-001",
    "player_name": "Crash",
    "class_key": "rogue",
    "room_reached": 3,
    "level_reached": 2,
    "victories": 2,
    "boss_kills": 0,
    "gold": 45,
    "score": 420,
    "run_over": false,
    "is_new_run": true
  }'

curl -i "$BASE_URL/api/leaderboard"

curl -i \
  -X POST "$BASE_URL/api/save-slot" \
  -H "Content-Type: application/json" \
  -d '{
    "player_name": "Crash",
    "payload": {
      "run_id": "test-run-001",
      "player": {
        "player_name": "Crash",
        "class_key": "rogue",
        "room": 3,
        "level": 2
      },
      "score": 420
    }
  }'

curl -i "$BASE_URL/api/save-slot/Crash"

curl -i "$BASE_URL/api/player/Crash"
```

## Notes

- SQLAlchemy is configured with `NullPool` for non-SQLite DBs to match transaction-pooler/serverless usage.
- Supabase transaction mode does not support prepared statements; keep DB session usage straightforward.
- Root compatibility shims (`config.py`, `db.py`, `models.py`, `repository.py`) are still present, but main development should happen in `oath_of_war/`.
