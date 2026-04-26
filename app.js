const clockEl = document.getElementById('clock');
const hourSelect = document.getElementById('hour-select');
const minuteSelect = document.getElementById('minute-select');
const addBtn = document.getElementById('add-btn');
const alarmList = document.getElementById('alarm-list');
const overlay = document.getElementById('overlay');
const modalSprite = document.getElementById('modal-sprite');
const modalName = document.getElementById('modal-name');
const modalTime = document.getElementById('modal-time');
const dismissBtn = document.getElementById('dismiss-btn');

// Populate selects
for (let h = 0; h < 24; h++) {
  const o = document.createElement('option');
  o.value = String(h).padStart(2, '0');
  o.textContent = String(h).padStart(2, '0');
  hourSelect.appendChild(o);
}
for (let m = 0; m < 60; m++) {
  const o = document.createElement('option');
  o.value = String(m).padStart(2, '0');
  o.textContent = String(m).padStart(2, '0');
  minuteSelect.appendChild(o);
}

// Default selects to current time
const now = new Date();
hourSelect.value = String(now.getHours()).padStart(2, '0');
minuteSelect.value = String(now.getMinutes()).padStart(2, '0');

let alarms = JSON.parse(localStorage.getItem('pk-alarms') || '[]');
let ringing = false;
let stopBeepFn = null;

function pad(n) { return String(n).padStart(2, '0'); }

async function fetchPokemon() {
  const id = Math.floor(Math.random() * 151) + 1; // Gen1
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await res.json();
  return {
    id,
    name: data.name,
    sprite: data.sprites.front_default,
    cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/${id}.ogg`,
  };
}

function tick() {
  const n = new Date();
  const h = pad(n.getHours());
  const m = pad(n.getMinutes());
  const s = pad(n.getSeconds());
  clockEl.textContent = `${h}:${m}:${s}`;

  if (!ringing && s === '00') {
    const hhmm = `${h}:${m}`;
    alarms.forEach(alarm => {
      if (alarm.active && alarm.time === hhmm) triggerAlarm(alarm);
    });
  }
}

function triggerAlarm(alarm) {
  ringing = true;
  modalSprite.src = alarm.sprite || '';
  modalName.textContent = alarm.name || '';
  modalTime.textContent = alarm.time;
  overlay.classList.remove('hidden');
  playCry(alarm.cry);
}

function playCry(cryUrl) {
  if (cryUrl) {
    const audio = new Audio(cryUrl);
    audio.loop = true;
    audio.play().catch(() => playBeep());
    stopBeepFn = () => { audio.pause(); audio.src = ''; };
  } else {
    playBeep();
  }
}

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let active = true;
  function beep() {
    if (!active) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
    setTimeout(beep, 700);
  }
  beep();
  stopBeepFn = () => { active = false; ctx.close(); };
}

dismissBtn.addEventListener('click', () => {
  ringing = false;
  overlay.classList.add('hidden');
  if (stopBeepFn) { stopBeepFn(); stopBeepFn = null; }
});

function saveAlarms() {
  localStorage.setItem('pk-alarms', JSON.stringify(alarms));
}

function renderAlarms() {
  alarmList.innerHTML = '';
  alarms.forEach((alarm, i) => {
    const li = document.createElement('li');
    li.className = `alarm-item ${alarm.active ? 'active' : ''}`;
    li.innerHTML = `
      <img class="pokemon-img ${alarm.sprite ? '' : 'loading'}"
           src="${alarm.sprite || ''}" alt="${alarm.name || ''}" />
      <div class="info">
        <div class="time">${alarm.time}</div>
        <div class="poke-name">${alarm.name || 'loading...'}</div>
      </div>
      <div class="controls">
        <button class="toggle ${alarm.active ? 'on' : ''}" data-i="${i}"></button>
        <button class="delete-btn" data-i="${i}">✕</button>
      </div>
    `;
    alarmList.appendChild(li);
  });

  alarmList.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      alarms[btn.dataset.i].active = !alarms[btn.dataset.i].active;
      saveAlarms(); renderAlarms();
    });
  });

  alarmList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alarms.splice(btn.dataset.i, 1);
      saveAlarms(); renderAlarms();
    });
  });
}

addBtn.addEventListener('click', async () => {
  const time = `${hourSelect.value}:${minuteSelect.value}`;
  const alarm = { time, active: true, name: '', sprite: '', cry: '' };
  alarms.push(alarm);
  saveAlarms();
  renderAlarms();

  try {
    const poke = await fetchPokemon();
    alarm.name = poke.name;
    alarm.sprite = poke.sprite;
    alarm.cry = poke.cry;
    saveAlarms();
    renderAlarms();
  } catch (e) {
    alarm.name = 'unknown';
    saveAlarms();
    renderAlarms();
  }
});

renderAlarms();
setInterval(tick, 1000);
tick();
