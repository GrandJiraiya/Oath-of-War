from flask import Flask, jsonify, render_template, request, session

from game.logic import (
    choose_reward,
    create_new_run,
    handle_gear_choice,
    resolve_battle,
    shop_action,
    state_for_client,
)

app = Flask(__name__)
app.secret_key = "replace-me-in-production"


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    return jsonify(state_for_client(session.get("run_state")))


@app.post("/api/new-run")
def new_run():
    data = request.get_json(force=True)
    hero_class = data.get("heroClass")
    if hero_class not in {"mage", "warrior", "rogue"}:
        return jsonify({"error": "Invalid class."}), 400
    session["run_state"] = create_new_run(hero_class)
    return jsonify(state_for_client(session["run_state"]))


@app.post("/api/fight")
def fight():
    run_state = session.get("run_state")
    if not run_state:
        return jsonify({"error": "No run active."}), 400
    data = request.get_json(force=True) or {}
    action = data.get("action", "attack")
    session["run_state"] = resolve_battle(run_state, action)
    return jsonify(state_for_client(session["run_state"]))


@app.post("/api/reward")
def reward():
    run_state = session.get("run_state")
    if not run_state:
        return jsonify({"error": "No run active."}), 400
    data = request.get_json(force=True) or {}
    reward_type = data.get("rewardType", "gear")
    session["run_state"] = choose_reward(run_state, reward_type)
    return jsonify(state_for_client(session["run_state"]))


@app.post("/api/gear")
def gear():
    run_state = session.get("run_state")
    if not run_state:
        return jsonify({"error": "No run active."}), 400
    data = request.get_json(force=True) or {}
    decision = data.get("decision", "sell")
    session["run_state"] = handle_gear_choice(run_state, decision)
    return jsonify(state_for_client(session["run_state"]))


@app.post("/api/shop")
def shop():
    run_state = session.get("run_state")
    if not run_state:
        return jsonify({"error": "No run active."}), 400
    data = request.get_json(force=True) or {}
    action = data.get("action", "leave")
    session["run_state"] = shop_action(run_state, action)
    return jsonify(state_for_client(session["run_state"]))


@app.post("/api/reset")
def reset():
    session.pop("run_state", None)
    return jsonify(state_for_client(None))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
