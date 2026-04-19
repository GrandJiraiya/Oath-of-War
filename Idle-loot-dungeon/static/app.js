const classGrid = document.getElementById("class-grid");
const classPicker = document.getElementById("class-picker");
const gameBoard = document.getElementById("game-board");
const heroStats = document.getElementById("hero-stats");
const gearList = document.getElementById("gear-list");
const roomTitle = document.getElementById("room-title");
const statusChip = document.getElementById("status-chip");
const enemyCard = document.getElementById("enemy-card");
const battleLog = document.getElementById("battle-log");
const merchantQuote = document.getElementById("merchant-quote");
const rewardPreviewBody = document.getElementById("reward-preview-body");
const battleActions = document.getElementById("battle-actions");
const rewardActions = document.getElementById("reward-actions");
const gearActions = document.getElementById("gear-actions");
const resetRunButton = document.getElementById("reset-run");

async function api(path, method = "GET", body = null) {
  const options = { method, headers: {} };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something exploded in the dungeon API.");
  }
  return data;
}

function rarityClass(rarity) {
  return {
    Common: "rarity-common",
    Rare: "rarity-rare",
    Epic: "rarity-epic",
    Legendary: "rarity-legendary",
  }[rarity] || "";
}

function gearText(item) {
  if (!item) return "Empty";
  const crit = item.crit ? `, +${Math.round(item.crit * 100)}% crit` : "";
  return `<span class="${rarityClass(item.rarity)}">${item.rarity} ${item.name}</span><br><small>+${item.atk} atk, +${item.defense} def, +${item.hp} hp${crit}</small>`;
}

function renderClassCards(classes) {
  classGrid.innerHTML = "";
  Object.entries(classes).forEach(([key, value]) => {
    const card = document.createElement("button");
    card.className = "class-card";
    card.innerHTML = `
      <h3>${value.label}</h3>
      <p>HP ${value.hp} · ATK ${value.attack} · DEF ${value.defense} · Crit ${Math.round(value.crit * 100)}%</p>
      <p><strong>${value.spell.name}</strong></p>
      <small>${value.spell.description}</small>
    `;
    card.addEventListener("click", async () => {
      const state = await api("/api/new-run", "POST", { heroClass: key });
      renderState(state);
    });
    classGrid.appendChild(card);
  });
}

function renderState(state) {
  renderClassCards(state.classes);

  if (!state.has_run) {
    classPicker.classList.remove("hidden");
    gameBoard.classList.add("hidden");
    return;
  }

  classPicker.classList.add("hidden");
  gameBoard.classList.remove("hidden");

  const player = state.player;
  heroStats.innerHTML = `
    <div class="stat-line"><span>Class</span><strong>${player.class}</strong></div>
    <div class="stat-line"><span>Level</span><strong>${player.level}</strong></div>
    <div class="stat-line"><span>Room</span><strong>${player.room}</strong></div>
    <div class="stat-line"><span>HP</span><strong>${player.hp}/${player.max_hp}</strong></div>
    <div class="stat-line"><span>Mana</span><strong>${player.mana}/${player.max_mana}</strong></div>
    <div class="stat-line"><span>Attack</span><strong>${player.attack}</strong></div>
    <div class="stat-line"><span>Defense</span><strong>${player.defense}</strong></div>
    <div class="stat-line"><span>Crit</span><strong>${player.crit}%</strong></div>
    <div class="stat-line"><span>Gold</span><strong>${player.gold}</strong></div>
    <div class="stat-line"><span>Potions</span><strong>${player.potions}</strong></div>
    <div class="stat-line"><span>XP</span><strong>${player.xp}/${player.xp_next}</strong></div>
    <div class="spell-box">
      <p class="eyebrow">Spell</p>
      <strong>${player.spell.name}</strong>
      <p>${player.spell.description}</p>
      <small>Mana Cost: ${player.spell.cost}</small>
    </div>
  `;

  gearList.innerHTML = ["Weapon", "Armor", "Trinket"]
    .map((slot) => `<div class="gear-row"><span>${slot}</span><div>${gearText(player.gear[slot])}</div></div>`)
    .join("");

  roomTitle.textContent = `Room ${player.room}`;
  statusChip.textContent = state.run_over ? "Defeated" : state.status;

  if (state.enemy) {
    enemyCard.innerHTML = `
      <h3>${state.enemy.is_boss ? "Boss" : "Enemy"}: ${state.enemy.name}</h3>
      <p>HP ${Math.max(0, state.enemy.hp)} · ATK ${state.enemy.attack} · DEF ${state.enemy.defense}</p>
    `;
  } else {
    enemyCard.innerHTML = `<h3>No enemy on screen</h3><p>Probably dead. Great for morale.</p>`;
  }

  merchantQuote.textContent = state.merchant_quote || "The merchant is polishing a suspiciously cursed helmet.";

  battleLog.innerHTML = "";
  (state.battle_log || []).forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    battleLog.appendChild(li);
  });

  if (state.last_reward) {
    const reward = state.last_reward;
    rewardPreviewBody.innerHTML = `
      <p class="${rarityClass(reward.rarity)}"><strong>${reward.rarity} ${reward.name}</strong></p>
      <p>${reward.slot}</p>
      <small>+${reward.atk} atk, +${reward.defense} def, +${reward.hp} hp${reward.crit ? `, +${Math.round(reward.crit * 100)}% crit` : ""}</small>
    `;
  } else {
    rewardPreviewBody.textContent = "No loose treasure right now.";
  }

  battleActions.classList.toggle("hidden", state.reward_pending || state.run_over || state.status === "gear");
  rewardActions.classList.toggle("hidden", !state.reward_pending || state.status === "gear" || state.run_over);
  gearActions.classList.toggle("hidden", state.status !== "gear" || state.run_over);
}

battleActions.addEventListener("click", async (event) => {
  const action = event.target.dataset.fight;
  if (!action) return;
  const state = await api("/api/fight", "POST", { action });
  renderState(state);
});

rewardActions.addEventListener("click", async (event) => {
  const rewardType = event.target.dataset.reward;
  if (!rewardType) return;
  const state = await api("/api/reward", "POST", { rewardType });
  renderState(state);
});

gearActions.addEventListener("click", async (event) => {
  const decision = event.target.dataset.gear;
  if (!decision) return;
  const state = await api("/api/gear", "POST", { decision });
  renderState(state);
});

document.addEventListener("click", async (event) => {
  const shopAction = event.target.dataset.shop;
  if (!shopAction) return;
  const state = await api("/api/shop", "POST", { action: shopAction });
  renderState(state);
});

resetRunButton.addEventListener("click", async () => {
  const state = await api("/api/reset", "POST");
  renderState(state);
});

api("/api/state").then(renderState).catch((error) => {
  console.error(error);
});
