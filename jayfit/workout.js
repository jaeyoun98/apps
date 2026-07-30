// JayFit workout.js — Workout screen: session timer, set logging, rest timer.
const REST_KEY = 'jayfit.restSec';
const REST_END_KEY = 'jayfit.restEndAt';
const DEFAULT_EXERCISES = [
  '스쿼트', '데드리프트', '벤치프레스', '오버헤드프레스', '바벨로우',
  '풀업', '랫풀다운', '레그프레스', '인클라인 벤치프레스', '덤벨컬',
  '사이드 레터럴 레이즈', '레그컬', '레그익스텐션', '카프레이즈',
];

let activeSession = null;
let sessionTimerId = null;
let restTimerId = null;
let restEndAt = null;
let workoutSummary = null;
let workoutInitialized = false;

function getRestSec() {
  return Number(localStorage.getItem(REST_KEY)) || 90;
}

function fmtClock(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function fmtDuration(ms) {
  const min = Math.round(Math.max(0, ms) / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`;
}

// --- session timer ---
function renderSessionTimer() {
  if (!activeSession) return;
  document.getElementById('session-timer').textContent =
    fmtClock(Date.now() - activeSession.start);
}

function startSessionTimer() {
  stopSessionTimer();
  renderSessionTimer();
  if (activeSession && document.visibilityState === 'visible') {
    sessionTimerId = setInterval(renderSessionTimer, 1000);
  }
}
function stopSessionTimer() {
  if (sessionTimerId !== null) { clearInterval(sessionTimerId); sessionTimerId = null; }
}

// --- rest timer ---
function startRestTimer(endAt = Date.now() + getRestSec() * 1000) {
  stopRestTimer();
  const banner = document.getElementById('rest-banner');
  restEndAt = endAt;
  localStorage.setItem(REST_END_KEY, String(restEndAt));
  banner.hidden = false;
  banner.classList.remove('rest-done');

  renderRestTimer();
  if (restEndAt && document.visibilityState === 'visible') {
    restTimerId = setInterval(renderRestTimer, 1000);
  }
}
function renderRestTimer() {
  if (!restEndAt) return;
  const banner = document.getElementById('rest-banner');
  const remain = document.getElementById('rest-remain');
  const left = Math.max(0, Math.ceil((restEndAt - Date.now()) / 1000));
  if (left === 0) {
    remain.textContent = '끝! 다음 세트 🔥';
    banner.classList.add('rest-done');
    restEndAt = null;
    localStorage.removeItem(REST_END_KEY);
    stopRestTimer();
    return;
  }
  remain.textContent = fmtClock(left * 1000);
}
function stopRestTimer() {
  if (restTimerId !== null) { clearInterval(restTimerId); restTimerId = null; }
}
function dismissRest() {
  stopRestTimer();
  restEndAt = null;
  localStorage.removeItem(REST_END_KEY);
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
    document.getElementById('set-weight').value = roundForInput(fromKg(last.weight));
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
      row.innerHTML = `<span>${i + 1}세트 — ${formatWeight(s.weight)} × ${s.reps}</span>`;
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
  const savedRestEnd = Number(localStorage.getItem(REST_END_KEY));
  if (savedRestEnd) startRestTimer(savedRestEnd);
}

function renderWorkoutSummary() {
  if (!workoutSummary) return;
  document.getElementById('summary-body').innerHTML =
    `<div class="summary-row">시간 <b>${fmtDuration(workoutSummary.duration)}</b></div>` +
    `<div class="summary-row">세트 <b>${workoutSummary.sets}개</b></div>` +
    `<div class="summary-row">볼륨 <b>${formatVolume(workoutSummary.volume)}</b></div>`;
}

async function finishWorkout() {
  const end = Math.max(Date.now(), activeSession.start);
  const sets = await getSetsBySession(db, activeSession.id);
  await endSession(db, activeSession.id, end);
  stopSessionTimer();
  dismissRest();

  const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);
  workoutSummary = { duration: end - activeSession.start, sets: sets.length, volume };
  renderWorkoutSummary();
  activeSession = null;
  showWorkoutState('summary');
}

function initWorkout() {
  if (workoutInitialized) return;
  workoutInitialized = true;

  const startButton = document.getElementById('workout-start');
  let sessionStarting = false;
  startButton.disabled = true;
  startButton.onclick = async () => {
    if (sessionStarting || activeSession) return;
    sessionStarting = true;
    startButton.disabled = true;
    dismissRest();
    try {
      const start = Date.now();
      const id = await addSession(db, todayStr(), start);
      activeSession = { id, date: todayStr(), start, end: null };
      enterActive();
    } finally {
      sessionStarting = false;
      startButton.disabled = false;
    }
  };

  document.getElementById('exercise-input').onchange = (e) => prefillFromLast(e.target.value.trim());

  document.getElementById('set-add').onclick = async () => {
    const exercise = document.getElementById('exercise-input').value.trim();
    const weightValue = Number(document.getElementById('set-weight').value);
    const reps = Number(document.getElementById('set-reps').value);
    if (!exercise) { alert('종목을 입력해 주세요.'); return; }
    if (!Number.isFinite(weightValue) || weightValue < 0) {
      alert('무게는 0 이상의 숫자로 입력해 주세요.');
      return;
    }
    if (!Number.isInteger(reps) || reps <= 0) {
      alert('reps는 1 이상의 정수로 입력해 주세요.');
      return;
    }
    const setAt = Date.now();
    startRestTimer(setAt + getRestSec() * 1000);
    try {
      await addSet(db, {
        sessionId: activeSession.id,
        exercise,
        weight: toCanonicalKg(weightValue),
        reps,
        ts: setAt,
      });
    } catch (error) {
      dismissRest();
      throw error;
    }
    renderSessionSets();
    refreshExerciseList();
  };

  document.querySelectorAll('[data-step-target]').forEach((btn) => {
    btn.onclick = () => {
      const input = document.getElementById(btn.dataset.stepTarget);
      const direction = Number(btn.dataset.stepDirection);
      const current = Number(input.value) || 0;
      const minimum = input.min === '' ? -Infinity : Number(input.min);
      input.value = roundForInput(Math.max(minimum, current + direction * Number(input.step)));
    };
  });

  document.getElementById('rest-banner').onclick = dismissRest;

  document.getElementById('rest-edit').onclick = () => {
    const v = prompt('세트 간 휴식 (초)', String(getRestSec()));
    const n = Number(v);
    if (n > 0) localStorage.setItem(REST_KEY, String(n));
  };

  document.getElementById('workout-end').onclick = () => {
    if (confirm('운동을 종료할까요?')) finishWorkout();
  };

  document.getElementById('summary-ok').onclick = () => {
    workoutSummary = null;
    showWorkoutState('idle');
  };

  const pauseTimers = () => {
    stopSessionTimer();
    stopRestTimer();
  };
  const resumeTimers = () => {
    if (document.visibilityState !== 'visible') return;
    if (activeSession) startSessionTimer();
    if (restEndAt) startRestTimer(restEndAt);
  };
  const syncTimerVisibility = () => {
    if (document.visibilityState === 'visible') resumeTimers();
    else pauseTimers();
  };
  document.addEventListener('visibilitychange', syncTimerVisibility);
  window.addEventListener('pagehide', pauseTimers);
  window.addEventListener('pageshow', resumeTimers);

  document.addEventListener('weightunitchange', () => {
    if (activeSession) renderSessionSets();
    renderWorkoutSummary();
  });

  // Resume an unfinished session after app reload (e.g. phone locked mid-workout).
  getActiveSession(db).then((sess) => {
    if (sess) { activeSession = sess; enterActive(); }
  }).finally(() => { startButton.disabled = false; });
}
