const $ = (id) => document.getElementById(id);

async function api(path, method = 'GET', body = null) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function log(message) {
  const out = $('log');
  out.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

async function refreshLeaderboard() {
  const data = await api('/api/leaderboard');
  const root = $('leaderboard');
  root.innerHTML = '';
  data.entries.forEach((entry, idx) => {
    const li = document.createElement('li');
    li.textContent = `#${idx + 1} ${entry.player_name} · ${entry.class_key} · score ${entry.score} · room ${entry.room_reached}`;
    root.appendChild(li);
  });
  if (!data.entries.length) root.innerHTML = '<li>No runs yet.</li>';
}

$('registerBtn').addEventListener('click', async () => {
  const payload = {
    player_name: $('playerName').value.trim(),
    preferred_class: $('preferredClass').value,
  };
  const data = await api('/api/player/register', 'POST', payload);
  log(data);
});

$('submitRunBtn').addEventListener('click', async () => {
  const payload = {
    run_id: $('runId').value.trim() || `run-${Date.now()}`,
    player_name: $('playerName').value.trim(),
    class_key: $('preferredClass').value,
    room_reached: Number($('roomReached').value || 1),
    level_reached: Number($('levelReached').value || 1),
    victories: Number($('victories').value || 0),
    boss_kills: Number($('bossKills').value || 0),
    gold: 0,
    score: Number($('score').value || 0),
    run_over: true,
    is_new_run: true,
  };
  const data = await api('/api/run/submit', 'POST', payload);
  log(data);
  await refreshLeaderboard();
});

$('saveSlotBtn').addEventListener('click', async () => {
  const payload = JSON.parse($('savePayload').value || '{}');
  const data = await api('/api/save-slot', 'POST', {
    player_name: $('playerName').value.trim(),
    payload,
  });
  log(data);
});

$('loadSlotBtn').addEventListener('click', async () => {
  const data = await api(`/api/save-slot/${encodeURIComponent($('playerName').value.trim())}`);
  $('saveOutput').textContent = JSON.stringify(data.payload, null, 2);
  log(data);
});

$('refreshLeaderboardBtn').addEventListener('click', refreshLeaderboard);

refreshLeaderboard().catch((err) => log(err.message));
