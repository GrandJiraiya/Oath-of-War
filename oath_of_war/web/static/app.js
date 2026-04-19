const $ = (id) => document.getElementById(id);

const CLASSES = {
  warrior: { label: 'Warrior', hp: 120, attack: 14, defense: 8, crit: 0.1, mana: 30, spell: { name: 'Shield Slam', cost: 12 } },
  mage: { label: 'Mage', hp: 85, attack: 18, defense: 4, crit: 0.16, mana: 60, spell: { name: 'Arc Burst', cost: 18 } },
  rogue: { label: 'Rogue', hp: 95, attack: 16, defense: 5, crit: 0.22, mana: 40, spell: { name: 'Shadow Flurry', cost: 15 } },
};

let state = {
  runId: null,
  playerName: '',
  classKey: null,
  room: 1,
  level: 1,
  victories: 0,
  bossKills: 0,
  gold: 0,
  score: 0,
  runOver: false,
  rewardPending: false,
  hero: null,
  enemy: null,
  log: [],
};

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
  $('log').textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

function appendBattleLog(message) {
  state.log = [message, ...state.log].slice(0, 12);
}

function requirePlayerName() {
  const value = $('playerName').value.trim();
  if (!value) throw new Error('Player name is required.');
  return value;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEnemy(room) {
  const boss = room % 5 === 0;
  const scale = room + 1;
  return {
    name: boss ? `Warlord of Room ${room}` : `Raider ${room}`,
    hp: boss ? 65 + scale * 12 : 40 + scale * 8,
    maxHp: boss ? 65 + scale * 12 : 40 + scale * 8,
    attack: boss ? 11 + scale * 2 : 6 + scale,
    defense: boss ? 5 + Math.floor(scale / 2) : 2 + Math.floor(scale / 3),
    isBoss: boss,
  };
}

function buildHero(classKey) {
  const archetype = CLASSES[classKey];
  return {
    maxHp: archetype.hp,
    hp: archetype.hp,
    attack: archetype.attack,
    defense: archetype.defense,
    crit: archetype.crit,
    mana: archetype.mana,
    maxMana: archetype.mana,
    potions: 2,
    spell: archetype.spell,
  };
}

function calcScore() {
  state.score = state.victories * 100 + state.room * 30 + state.bossKills * 350 + state.gold;
}

function render() {
  $('game-board').classList.toggle('hidden', !state.hero);
  $('battle-actions').classList.toggle('hidden', state.runOver || state.rewardPending);
  $('reward-actions').classList.toggle('hidden', state.runOver || !state.rewardPending);

  if (!state.hero) return;

  $('room-title').textContent = `Room ${state.room}`;
  $('status-chip').textContent = state.runOver ? 'defeated' : state.rewardPending ? 'reward' : 'battle';

  $('hero-stats').innerHTML = [
    ['Class', CLASSES[state.classKey].label],
    ['HP', `${state.hero.hp}/${state.hero.maxHp}`],
    ['Mana', `${state.hero.mana}/${state.hero.maxMana}`],
    ['Attack', state.hero.attack],
    ['Defense', state.hero.defense],
    ['Crit', `${Math.round(state.hero.crit * 100)}%`],
    ['Potions', state.hero.potions],
    ['Gold', state.gold],
    ['Victories', state.victories],
    ['Boss kills', state.bossKills],
    ['Score', state.score],
  ]
    .map(([k, v]) => `<div class="stat-line"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');

  const enemy = state.enemy;
  $('enemy-card').innerHTML = enemy
    ? `<h3>${enemy.isBoss ? 'Boss' : 'Enemy'}: ${enemy.name}</h3>
       <p>HP ${Math.max(0, enemy.hp)}/${enemy.maxHp} · ATK ${enemy.attack} · DEF ${enemy.defense}</p>`
    : '<h3>No enemy present</h3><p>Collect your reward or move forward.</p>';

  $('battle-log').innerHTML = state.log.map((row) => `<li>${row}</li>`).join('');
  $('merchant-quote').textContent =
    state.room % 3 === 0
      ? 'Merchant: “Everything is expensive today.”'
      : 'Merchant: “You look like someone who needs better gear.”';

  $('run-snapshot').textContent = JSON.stringify(
    {
      run_id: state.runId,
      room: state.room,
      level: state.level,
      score: state.score,
      run_over: state.runOver,
    },
    null,
    2,
  );
}

function runPayload(isNewRun = false) {
  return {
    run_id: state.runId,
    player_name: state.playerName,
    class_key: state.classKey,
    room_reached: state.room,
    level_reached: state.level,
    victories: state.victories,
    boss_kills: state.bossKills,
    gold: state.gold,
    score: state.score,
    run_over: state.runOver,
    is_new_run: isNewRun,
  };
}

function savePayload() {
  return {
    run_id: state.runId,
    class_key: state.classKey,
    room: state.room,
    level: state.level,
    victories: state.victories,
    boss_kills: state.bossKills,
    gold: state.gold,
    score: state.score,
    run_over: state.runOver,
    reward_pending: state.rewardPending,
    hero: state.hero,
    enemy: state.enemy,
    log: state.log,
  };
}

async function persistProgress({ isNewRun = false, saveSlot = false } = {}) {
  if (!state.hero || !state.playerName) return;
  calcScore();
  const submitted = await api('/api/run/submit', 'POST', runPayload(isNewRun));
  if (saveSlot) {
    await api('/api/save-slot', 'POST', { player_name: state.playerName, payload: savePayload() });
  }
  await refreshLeaderboard();
  log(submitted);
}

function startRun(classKey) {
  state.classKey = classKey;
  state.runId = `run-${Date.now()}`;
  state.room = 1;
  state.level = 1;
  state.victories = 0;
  state.bossKills = 0;
  state.gold = 25;
  state.score = 0;
  state.runOver = false;
  state.rewardPending = false;
  state.hero = buildHero(classKey);
  state.enemy = createEnemy(state.room);
  state.log = [`New run started as ${CLASSES[classKey].label}.`];
}

function heroDamage(base, targetDefense) {
  const crit = Math.random() < state.hero.crit;
  const dealt = Math.max(1, base - targetDefense + randomInt(0, 4) + (crit ? 8 : 0));
  return { dealt, crit };
}

function enemyDamage() {
  return Math.max(1, state.enemy.attack - state.hero.defense + randomInt(0, 3));
}

async function fight(action) {
  if (!state.enemy || state.runOver || state.rewardPending) return;

  if (action === 'potion') {
    if (state.hero.potions < 1) {
      appendBattleLog('No potions left.');
      return render();
    }
    state.hero.potions -= 1;
    const healed = Math.max(10, Math.floor(state.hero.maxHp * 0.3));
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + healed);
    appendBattleLog(`You drink a potion and heal ${healed} HP.`);
  } else {
    const useSpell = action === 'spell';
    if (useSpell && state.hero.mana < state.hero.spell.cost) {
      appendBattleLog('Not enough mana for spell.');
      return render();
    }
    if (useSpell) state.hero.mana -= state.hero.spell.cost;

    const base = useSpell ? state.hero.attack + 8 : state.hero.attack;
    const hit = heroDamage(base, state.enemy.defense);
    state.enemy.hp -= hit.dealt;
    appendBattleLog(`${useSpell ? state.hero.spell.name : 'Attack'} hits ${state.enemy.name} for ${hit.dealt}${hit.crit ? ' (CRIT)' : ''}.`);
  }

  if (state.enemy.hp <= 0) {
    state.victories += 1;
    const rewardGold = state.enemy.isBoss ? 60 : 20;
    state.gold += rewardGold;
    if (state.enemy.isBoss) state.bossKills += 1;
    state.rewardPending = true;
    appendBattleLog(`Enemy defeated. You gain ${rewardGold} gold and can now choose a reward.`);
    state.enemy = null;
    await persistProgress({ saveSlot: true });
    return render();
  }

  const incoming = enemyDamage();
  state.hero.hp -= incoming;
  appendBattleLog(`${state.enemy.name} hits you for ${incoming}.`);

  if (state.hero.hp <= 0) {
    state.hero.hp = 0;
    state.runOver = true;
    appendBattleLog('You were defeated. Start a new run or load your save.');
  }

  await persistProgress({ saveSlot: true });
  render();
}

async function applyReward(type) {
  if (!state.rewardPending || state.runOver) return;
  if (type === 'heal') state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + Math.floor(state.hero.maxHp * 0.35));
  if (type === 'gold') state.gold += 45;
  if (type === 'power') {
    state.hero.attack += 2;
    state.hero.defense += 1;
  }
  state.rewardPending = false;
  appendBattleLog(`Reward accepted: ${type}.`);
  await persistProgress({ saveSlot: true });
  render();
}

async function nextRoom() {
  if (state.runOver || state.rewardPending || !state.hero) return;
  state.room += 1;
  state.level = Math.max(state.level, Math.ceil(state.room / 2));
  state.hero.mana = Math.min(state.hero.maxMana, state.hero.mana + 8);
  state.enemy = createEnemy(state.room);
  appendBattleLog(`You step into room ${state.room}.`);
  await persistProgress({ saveSlot: true });
  render();
}

async function shop(action) {
  if (!state.hero || state.runOver) return;
  if (action === 'potion' && state.gold >= 25) {
    state.gold -= 25;
    state.hero.potions += 1;
    appendBattleLog('Bought a potion.');
  } else if (action === 'attack' && state.gold >= 35) {
    state.gold -= 35;
    state.hero.attack += 2;
    appendBattleLog('Weapon sharpened. +2 attack.');
  } else if (action === 'armor' && state.gold >= 35) {
    state.gold -= 35;
    state.hero.defense += 2;
    appendBattleLog('Armor reinforced. +2 defense.');
  } else {
    appendBattleLog('Not enough gold for that purchase.');
    render();
    return;
  }
  await persistProgress({ saveSlot: true });
  render();
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

async function loadPlayerData(playerName) {
  const profile = await api(`/api/player/${encodeURIComponent(playerName)}`);
  if (profile.player?.preferred_class) $('preferredClass').value = profile.player.preferred_class;
  if (profile.save_slot) {
    restoreFromSave(playerName, profile.save_slot);
    render();
  }
  log(profile);
}

function restoreFromSave(playerName, payload) {
  state = {
    ...state,
    playerName,
    runId: payload.run_id || `run-${Date.now()}`,
    classKey: payload.class_key,
    room: payload.room || 1,
    level: payload.level || 1,
    victories: payload.victories || 0,
    bossKills: payload.boss_kills || 0,
    gold: payload.gold || 0,
    score: payload.score || 0,
    runOver: Boolean(payload.run_over),
    rewardPending: Boolean(payload.reward_pending),
    hero: payload.hero,
    enemy: payload.enemy,
    log: Array.isArray(payload.log) ? payload.log : [],
  };
  appendBattleLog('Cloud save loaded.');
}

async function runAction(action) {
  try {
    await action();
  } catch (err) {
    log(err.message || 'Unexpected error');
  }
}

$('registerBtn').addEventListener('click', () =>
  runAction(async () => {
    const player_name = requirePlayerName();
    const preferred_class = $('preferredClass').value;
    localStorage.setItem('oow_player_name', player_name);
    const res = await api('/api/player/register', 'POST', { player_name, preferred_class });
    log(res);
  }),
);

$('startRunBtn').addEventListener('click', () =>
  runAction(async () => {
    state.playerName = requirePlayerName();
    localStorage.setItem('oow_player_name', state.playerName);
    await api('/api/player/register', 'POST', { player_name: state.playerName, preferred_class: $('preferredClass').value });
    startRun($('preferredClass').value);
    render();
    await persistProgress({ isNewRun: true, saveSlot: true });
  }),
);

$('loadSaveBtn').addEventListener('click', () =>
  runAction(async () => {
    const playerName = requirePlayerName();
    const data = await api(`/api/save-slot/${encodeURIComponent(playerName)}`);
    restoreFromSave(playerName, data.payload);
    render();
    log(data);
  }),
);

$('saveNowBtn').addEventListener('click', () => runAction(() => persistProgress({ saveSlot: true })));
$('refreshLeaderboardBtn').addEventListener('click', () => runAction(refreshLeaderboard));
$('battle-actions').addEventListener('click', (event) => runAction(() => fight(event.target.dataset.fight)));
$('reward-actions').addEventListener('click', (event) => runAction(() => applyReward(event.target.dataset.reward)));
$('nextRoomBtn').addEventListener('click', () => runAction(nextRoom));
$('resetRunBtn').addEventListener('click', () => {
  state = { ...state, hero: null, enemy: null, runOver: false, rewardPending: false, log: [] };
  render();
});
document.addEventListener('click', (event) => {
  const action = event.target.dataset.shop;
  if (action) runAction(() => shop(action));
});

(async function bootstrap() {
  try {
    const cachedName = localStorage.getItem('oow_player_name');
    if (cachedName) {
      $('playerName').value = cachedName;
      await loadPlayerData(cachedName);
    }
    await refreshLeaderboard();
    render();
  } catch (err) {
    log(err.message || 'Failed to initialize app');
  }
})();
