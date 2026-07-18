// JayFit workout.js — Workout screen: session timer, set logging, rest timer.
const REST_KEY = 'jayfit.restSec';
const DEFAULT_EXERCISES = [
  '스쿼트', '데드리프트', '벤치프레스', '오버헤드프레스', '바벨로우',
  '풀업', '랫풀다운', '레그프레스', '인클라인 벤치프레스', '덤벨컬',
  '사이드 레터럴 레이즈', '레그컬', '레그익스텐션', '카프레이즈',
];

let activeSession = null;
let sessionTimerId = null;
let restTimerId = null;

function getRestSec() {
  return Number(localStorage.getItem(REST_KEY)) || 90;
}

function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`;
}

// --- session timer ---
function startSessionTimer() {
  stopSessionTimer();
  const el = document.getElementById('session-timer');
  const tick = () => { el.textContent = fmtClock(Date.now() - activeSession.start); };
  tick();
  sessionTimerId = setInterval(tick, 1000);
}
function stopSessionTimer() {
  if (sessionTimerId) { clearInterval(sessionTimerId); sessionTimerId = null; }
}

// --- rest timer ---
function startRestTimer() {
  stopRestTimer();
  const banner = document.getElementById('rest-banner');
  const remain = document.getElementById('rest-remain');
  let left = getRestSec();
  banner.hidden = false;
  banner.classList.remove('rest-done');
  const tick = () => {
    if (left <= 0) {
      remain.textContent = '끝! 다음 세트 🔥';
      banner.classList.add('rest-done');
      stopRestTimer();
      return;
    }
    remain.textContent = fmtClock(left * 1000);
    left -= 1;
  };
  tick();
  restTimerId = setInterval(tick, 1000);
}
function stopRestTimer() {
  if (restTimerId) { clearInterval(restTimerId); restTimerId = null; }
}
function dismissRest() {
  stopRestTimer();
  document.getElementById('rest-banner').hidden = true;
}

// --- exercise suggestions: defaults + everything logged before ---
async function refreshExerciseList() {
  const all = await getAllSets(db);
  const names = new Set(DEFAULT_EXERCISES);
  all.forEach((s) => names.add(s.exercise));
  const dl = document.getElementById('exercise-list');
  dl.innerHTML = '';
  [...names].forEach((n) => {
    const opt = document.createElement('option');
    opt.value = n;
    dl.appendChild(opt);
  });
}

// Prefill weight/reps from the most recent set of the chosen exercise.
async function prefillFromLast(exercise) {
  if (!exercise) return;
  const last = await getLastSetByExercise(db, exercise);
  if (last) {
    document.getElementById('set-weight').value = last.weight;
    document.getElementById('set-reps').value = last.reps;
  }
}

// --- set list, grouped by exercise in logging order ---
async function renderSessionSets() {
  const sets = await getSetsBySession(db, activeSession.id);
  sets.sort((a, b) => a.ts - b.ts);

  const groups = new Map(); // exercise -> sets[]
  for (const s of sets) {
    if (!groups.has(s.exercise)) groups.set(s.exercise, []);
    groups.get(s.exercise).push(s);
  }

  const wrap = document.getElementById('session-sets');
  wrap.innerHTML = '';
  for (const [exercise, list] of groups) {
    const box = document.createElement('div');
    box.className = 'exercise-group';
    const h = document.createElement('div');
    h.className = 'exercise-name';
    h.textContent = exercise;
    box.appendChild(h);
    list.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'set-line';
      row.innerHTML = `<span>${i + 1}세트 — ${s.weight}kg × ${s.reps}</span>`;
      const del = document.createElement('button');
      del.className = 'entry-del';
      del.textContent = '✕';
      del.onclick = async () => { await deleteSet(db, s.id); renderSessionSets(); };
      row.appendChild(del);
      box.appendChild(row);
    });
    wrap.appendChild(box);
  }
}

// --- screen states ---
function showWorkoutState(state) { // 'idle' | 'active' | 'summary'
  document.getElementById('workout-idle').hidden = state !== 'idle';
  document.getElementById('workout-active').hidden = state !== 'active';
  document.getElementById('workout-summary').hidden = state !== 'summary';
}

async function enterActive() {
  showWorkoutState('active');
  startSessionTimer();
  refreshExerciseList();
  renderSessionSets();
}

async function finishWorkout() {
  const end = Date.now();
  const sets = await getSetsBySession(db, activeSession.id);
  await endSession(db, activeSession.id, end);
  stopSessionTimer();
  dismissRest();

  const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);
  document.getElementById('summary-body').innerHTML =
    `<div class="summary-row">시간 <b>${fmtDuration(end - activeSession.start)}</b></div>` +
    `<div class="summary-row">세트 <b>${sets.length}개</b></div>` +
    `<div class="summary-row">볼륨 <b>${Math.round(volume).toLocaleString()}kg</b></div>`;
  activeSession = null;
  showWorkoutState('summary');
}

function initWorkout() {
  document.getElementById('workout-start').onclick = async () => {
    const start = Date.now();
    const id = await addSession(db, todayStr(), start);
    activeSession = { id, date: todayStr(), start, end: null };
    enterActive();
  };

  document.getElementById('exercise-input').onchange = (e) => prefillFromLast(e.target.value.trim());

  document.getElementById('set-add').onclick = async () => {
    const exercise = document.getElementById('exercise-input').value.trim();
    const weight = Number(document.getElementById('set-weight').value);
    const reps = Number(document.getElementById('set-reps').value);
    if (!exercise) { alert('종목을 입력해 주세요.'); return; }
    if (!reps || reps <= 0) { alert('reps를 입력해 주세요.'); return; }
    await addSet(db, { sessionId: activeSession.id, exercise, weight: weight || 0, reps, ts: Date.now() });
    renderSessionSets();
    refreshExerciseList();
    startRestTimer();
  };

  document.getElementById('rest-banner').onclick = dismissRest;

  document.getElementById('rest-edit').onclick = () => {
    const v = prompt('세트 간 휴식 (초)', String(getRestSec()));
    const n = Number(v);
    if (n > 0) localStorage.setItem(REST_KEY, String(n));
  };

  document.getElementById('workout-end').onclick = () => {
    if (confirm('운동을 종료할까요?')) finishWorkout();
  };

  document.getElementById('summary-ok').onclick = () => showWorkoutState('idle');

  // Resume an unfinished session after app reload (e.g. phone locked mid-workout).
  getActiveSession(db).then((sess) => {
    if (sess) { activeSession = sess; enterActive(); }
  });
}
