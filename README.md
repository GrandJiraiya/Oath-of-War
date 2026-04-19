# Oath of War — Vercel + Turso Starter

This starter adds the **online persistence layer** for your game:

- player registration / profile rows
- shared top-5 leaderboard
- cloud save slots
- Flask API routes ready for Vercel
- Turso-ready SQLAlchemy setup
- SQLite fallback for local dev

## Quick start locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/init_db.py
python -m flask --app app run --host=0.0.0.0 --port=8000
```

## Environment variables

### Local SQLite

```env
FLASK_SECRET_KEY=change-me
DATABASE_URL=sqlite:///local.db
```

### Turso on Vercel

```env
FLASK_SECRET_KEY=change-me
DATABASE_URL=sqlite+libsql://YOUR_DB.turso.io/?authToken=YOUR_TOKEN&secure=true
```

You can also use the legacy split variables:

```env
TURSO_DATABASE_URL=libsql://YOUR_DB.turso.io
TURSO_AUTH_TOKEN=YOUR_TOKEN
```

## Turso setup

Install the CLI, create the DB, and get your credentials:

```bash
turso db create oath-of-war
turso db show --url oath-of-war
turso db tokens create oath-of-war
```

Then put the resulting URL/token into your environment variables.

## Vercel deploy

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the environment variables in Project Settings.
4. Deploy.
5. Add the custom subdomain `rpg.crashoutcrypto.xyz` to the Vercel project.

## API routes

- `GET /api/health`
- `POST /api/player/register`
- `GET /api/player/<player_name>`
- `GET /api/leaderboard`
- `POST /api/run/submit`
- `POST /api/save-slot`
- `GET /api/save-slot/<player_name>`

## How to merge this into your existing game

Keep your current combat/gameplay frontend and replace the browser-local storage calls with:

- `POST /api/player/register` when the player enters a name
- `POST /api/run/submit` after a run ends or when you want to update score progress
- `POST /api/save-slot` for cloud saves
- `GET /api/leaderboard` for the shared top 5

This repo is intentionally focused on the online layer so it is easy to bolt onto the game logic you already built.
