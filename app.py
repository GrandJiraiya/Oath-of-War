from __future__ import annotations

from flask import Flask, jsonify, render_template, request
from sqlalchemy.exc import SQLAlchemyError

from config import Settings
from db import Base, SessionLocal, engine
from repository import fetch_leaderboard, fetch_player, load_slot, save_slot, submit_run, upsert_player

app = Flask(__name__)
app.config["SECRET_KEY"] = Settings.SECRET_KEY

# Safe for local SQLite bootstrap; for Turso this can also create tables through libSQL if credentials are set.
Base.metadata.create_all(bind=engine)


@app.get("/")
def index():
    return render_template("index.html", app_name=Settings.APP_NAME)


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "app": Settings.APP_NAME})


@app.get("/api/leaderboard")
def leaderboard():
    with SessionLocal() as session:
        return jsonify({"entries": fetch_leaderboard(session, limit=5)})


@app.get("/api/player/<player_name>")
def get_player(player_name: str):
    with SessionLocal() as session:
        player = fetch_player(session, player_name)
        save_payload = load_slot(session, player_name)
        if not player:
            return jsonify({"error": "Player not found."}), 404
        return jsonify({"player": player, "save_slot": save_payload})


@app.post("/api/player/register")
def register_player():
    data = request.get_json(force=True) or {}
    player_name = (data.get("player_name") or "").strip()
    preferred_class = data.get("preferred_class")
    if not player_name:
        return jsonify({"error": "player_name is required."}), 400
    with SessionLocal() as session:
        player = upsert_player(session, player_name, preferred_class)
        session.commit()
        return jsonify({
            "player": {
                "player_name": player.player_name,
                "preferred_class": player.preferred_class,
                "total_runs": player.total_runs,
                "highest_room": player.highest_room,
                "best_score": player.best_score,
            }
        })


@app.post("/api/run/submit")
def submit_run_api():
    data = request.get_json(force=True) or {}
    required = {"run_id", "player_name", "class_key", "score"}
    if not required.issubset(data.keys()):
        return jsonify({"error": f"Missing required fields: {sorted(required - set(data.keys()))}"}), 400
    try:
        with SessionLocal() as session:
            player = submit_run(session, data)
            leaderboard_rows = fetch_leaderboard(session, limit=5)
            return jsonify({"ok": True, "player": player, "leaderboard": leaderboard_rows})
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/api/save-slot")
def save_slot_api():
    data = request.get_json(force=True) or {}
    player_name = (data.get("player_name") or "").strip()
    payload = data.get("payload")
    if not player_name or payload is None:
        return jsonify({"error": "player_name and payload are required."}), 400
    with SessionLocal() as session:
        save_slot(session, player_name, payload)
        return jsonify({"ok": True})


@app.get("/api/save-slot/<player_name>")
def load_slot_api(player_name: str):
    with SessionLocal() as session:
        payload = load_slot(session, player_name)
        if payload is None:
            return jsonify({"error": "Save slot not found."}), 404
        return jsonify({"payload": payload})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
