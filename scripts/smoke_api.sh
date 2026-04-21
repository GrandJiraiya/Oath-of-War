#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://rpg.crashoutcrypto.xyz}"

echo "Using BASE_URL=$BASE_URL"

echo "== health =="
curl -i "$BASE_URL/api/health"

echo "\n== register =="
curl -i -X POST "$BASE_URL/api/player/register" \
  -H "Content-Type: application/json" \
  -d '{"player_name":"Crash","preferred_class":"rogue"}'

echo "\n== submit run =="
curl -i -X POST "$BASE_URL/api/run/submit" \
  -H "Content-Type: application/json" \
  -d '{"run_id":"test-run-001","player_name":"Crash","class_key":"rogue","room_reached":3,"level_reached":2,"victories":2,"boss_kills":0,"gold":45,"score":420,"run_over":false,"is_new_run":true}'

echo "\n== leaderboard =="
curl -i "$BASE_URL/api/leaderboard"

echo "\n== save slot =="
curl -i -X POST "$BASE_URL/api/save-slot" \
  -H "Content-Type: application/json" \
  -d '{"player_name":"Crash","payload":{"run_id":"test-run-001","player":{"player_name":"Crash","class_key":"rogue","room":3,"level":2},"score":420}}'

echo "\n== load save slot =="
curl -i "$BASE_URL/api/save-slot/Crash"

echo "\n== load player =="
curl -i "$BASE_URL/api/player/Crash"
