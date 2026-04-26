const clockEl = document.getElementById('clock');
const alarmTimeInput = document.getElementById('alarm-time');
const addBtn = document.getElementById('add-btn');
const alarmList = document.getElementById('alarm-list');
const overlay = document.getElementById('overlay');
const modalTime = document.getElementById('modal-time');
const dismissBtn = document.getElementById('dismiss-btn');

let alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
let ringing = false;

function pad(n) {
  return String(n).padStart(2, '0');
}

function tick() {
  const now = new Date();
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  clockEl.textContent = `${h}:${m}:${s}`;

  if (!ringing) {
    const hhmm = `${h}:${m}`;
    alarms.forEach(alarm => {
      if (alarm.active && alarm.time === hhmm && s === '00') {
        triggerAlarm(alarm.time);
      }
    });
  }
}

function triggerAlarm(time) {
  ringing = true;
  modalTime.textContent = time;
  overlay.classList.remove('hidden');
  // Web Audio API でビープ音を生成（外部リソース不要）
  startBeep();
}

function startBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let playing = true;

  function beep() {
    if (!playing) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(beep, 600);
  }

  beep();
  window._stopBeep = () => { playing = false; ctx.close(); };
}

dismissBtn.addEventListener('click', () => {
  ringing = false;
  overlay.classList.add('hidden');
  if (window._stopBeep) window._stopBeep();
});

function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

function renderAlarms() {
  alarmList.innerHTML = '';
  alarms.forEach((alarm, i) => {
    const li = document.createElement('li');
    li.className = `alarm-item ${alarm.active ? 'active' : ''}`;
    li.innerHTML = `
      <div>
        <div class="time">${alarm.time}</div>
        <div class="status">${alarm.active ? 'ON' : 'OFF'}</div>
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
      const i = btn.dataset.i;
      alarms[i].active = !alarms[i].active;
      saveAlarms();
      renderAlarms();
    });
  });

  alarmList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alarms.splice(btn.dataset.i, 1);
      saveAlarms();
      renderAlarms();
    });
  });
}

addBtn.addEventListener('click', () => {
  const time = alarmTimeInput.value;
  if (!time) return;
  alarms.push({ time, active: true });
  saveAlarms();
  renderAlarms();
  alarmTimeInput.value = '';
});

renderAlarms();
setInterval(tick, 1000);
tick();
