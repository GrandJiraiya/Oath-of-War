from __future__ import annotations

import json
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from models import Player, Run, SaveSlot


def normalize_name(player_name: str) -> str:
    return player_name.strip()[:40]


def upsert_player(session: Session, player_name: str, preferred_class: str | None = None) -> Player:
    name = normalize_name(player_name)
    player = session.scalar(select(Player).where(Player.player_name == name))
    if not player:
        player = Player(player_name=name, preferred_class=preferred_class)
        session.add(player)
        session.flush()
    elif preferred_class:
        player.preferred_class = preferred_class
    return player


def submit_run(session: Session, payload: dict[str, Any]) -> dict[str, Any]:
    player_name = normalize_name(payload["player_name"])
    player = upsert_player(session, player_name, payload.get("class_key"))

    run = session.scalar(select(Run).where(Run.run_id == payload["run_id"]))
    if not run:
        run = Run(run_id=payload["run_id"], player_name=player_name, class_key=payload["class_key"])
        session.add(run)

    run.class_key = payload["class_key"]
    run.room_reached = int(payload.get("room_reached", 1))
    run.level_reached = int(payload.get("level_reached", 1))
    run.victories = int(payload.get("victories", 0))
    run.boss_kills = int(payload.get("boss_kills", 0))
    run.gold = int(payload.get("gold", 0))
    run.score = int(payload.get("score", 0))
    run.run_over = 1 if payload.get("run_over") else 0

    player.total_runs = max(player.total_runs, 0)
    if payload.get("is_new_run"):
        player.total_runs += 1
    player.highest_room = max(player.highest_room, run.room_reached)
    player.best_score = max(player.best_score, run.score)
    player.preferred_class = payload.get("class_key") or player.preferred_class

    session.commit()
    return serialize_player(player)


def save_slot(session: Session, player_name: str, payload: dict[str, Any]) -> None:
    name = normalize_name(player_name)
    slot = session.scalar(select(SaveSlot).where(SaveSlot.player_name == name))
    if not slot:
        slot = SaveSlot(player_name=name, payload_json=json.dumps(payload))
        session.add(slot)
    else:
        slot.payload_json = json.dumps(payload)
    session.commit()


def load_slot(session: Session, player_name: str) -> dict[str, Any] | None:
    name = normalize_name(player_name)
    slot = session.scalar(select(SaveSlot).where(SaveSlot.player_name == name))
    return json.loads(slot.payload_json) if slot else None


def fetch_player(session: Session, player_name: str) -> dict[str, Any] | None:
    player = session.scalar(select(Player).where(Player.player_name == normalize_name(player_name)))
    return serialize_player(player) if player else None


def fetch_leaderboard(session: Session, limit: int = 5) -> list[dict[str, Any]]:
    stmt = select(Run).order_by(desc(Run.score), desc(Run.room_reached), desc(Run.level_reached)).limit(limit)
    return [serialize_run(row) for row in session.scalars(stmt)]


def serialize_player(player: Player | None) -> dict[str, Any] | None:
    if not player:
        return None
    return {
        "player_name": player.player_name,
        "preferred_class": player.preferred_class,
        "total_runs": player.total_runs,
        "highest_room": player.highest_room,
        "best_score": player.best_score,
    }


def serialize_run(run: Run) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "player_name": run.player_name,
        "class_key": run.class_key,
        "room_reached": run.room_reached,
        "level_reached": run.level_reached,
        "victories": run.victories,
        "boss_kills": run.boss_kills,
        "gold": run.gold,
        "score": run.score,
        "run_over": bool(run.run_over),
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }
