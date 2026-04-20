from __future__ import annotations
from typing import Any
from flask import Flask, jsonify, render_template, request
from sqlalchemy.exc import SQLAlchemyError
from oath_of_war.config import Settings
from oath_of_war.db import Base, SessionLocal, engine
from oath_of_war.repository import (
    fetch_leaderboard,
    fetch_player,
    load_slot,
    save_slot,
    submit_run,
    upsert_player,
)


def _json_error(message: str, status_code: int):
    return jsonify({"error": message}), status_code


def _parse_json_body() -> dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("Request body must be a valid JSON object.")
    return data


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder="web/templates",
        static_folder="web/static",
    )
    app.config["SECRET_KEY"] = Settings.SECRET_KEY
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
        try:
            data = _parse_json_body()
        except ValueError as exc:
            return _json_error(str(exc), 400)
        player_name = (data.get("player_name") or "").strip()
        preferred_class = data.get("preferred_class")
        if not player_name:
            return _json_error("player_name is required.", 400)
        with SessionLocal() as session:
            try:
                player = upsert_player(session, player_name, preferred_class)
                session.commit()
                return jsonify(
                    {
                        "player": {
                            "player_name": player.player_name,
                            "preferred_class": player.preferred_class,
                            "total_runs": player.total_runs,
                            "highest_room": player.highest_room,
                            "best_score": player.best_score,
                        }
                    }
                )
            except SQLAlchemyError:
                session.rollback()
                return _json_error("Failed to register player.", 500)

    @app.post("/api/run/submit")
    def submit_run_api():
        try:
            data = _parse_json_body()
        except ValueError as exc:
            return _json_error(str(exc), 400)
        required = {"run_id", "player_name", "class_key", "score"}
        if not required.issubset(data.keys()):
            return _json_error(
                f"Missing required fields: {sorted(required - set(data.keys()))}",
                400,
            )
        try:
            with SessionLocal() as session:
                try:
                    player = submit_run(session, data)
                    session.commit()
                    leaderboard_rows = fetch_leaderboard(session, limit=5)
                    return jsonify(
                        {
                            "ok": True,
                            "player": player,
                            "leaderboard": leaderboard_rows,
                        }
                    )
                except SQLAlchemyError:
                    session.rollback()
                    raise
        except SQLAlchemyError:
            return _json_error("Failed to submit run.", 500)

    @app.post("/api/save-slot")
    def save_slot_api():
        try:
            data = _parse_json_body()
        except ValueError as exc:
            return _json_error(str(exc), 400)
        player_name = (data.get("player_name") or "").strip()
        payload = data.get("payload")
        if not player_name or payload is None:
            return _json_error("player_name and payload are required.", 400)
        if not isinstance(payload, dict):
            return _json_error("payload must be a JSON object.", 400)
        with SessionLocal() as session:
            try:
                save_slot(session, player_name, payload)
                session.commit()
                return jsonify({"ok": True})
            except SQLAlchemyError:
                session.rollback()
                return _json_error("Failed to save slot.", 500)

    @app.get("/api/save-slot/<player_name>")
    def load_slot_api(player_name: str):
        with SessionLocal() as session:
            payload = load_slot(session, player_name)
            if payload is None:
                return jsonify({"error": "Save slot not found."}), 404
            return jsonify({"payload": payload})

    return app
