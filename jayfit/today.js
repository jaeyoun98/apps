// JayFit today.js — Today screen: protein counter + body weight log.
const GOAL_KEY = 'jayfit.proteinGoal';
const RING_CIRC = 339.29; // 2 * PI * r(54)

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function getGoal() {
  return Number(localStorage.getItem(GOAL_KEY)) || 130;
}

async function renderProtein() {
  const entries = await getProteinByDate(db, todayStr());
  entries.sort((a, b) => a.ts - b.ts);
  const total = entries.reduce((sum, e) => sum + e.grams, 0);
  const goal = getGoal();

  document.getElementById('protein-total').textContent = Math.round(total);
  document.getElementById('protein-goal').textContent = goal;

  const ratio = Math.min(total / goal, 1);
  document.getElementById('protein-ring').style.strokeDashoffset = RING_CIRC * (1 - ratio);

  const list = document.getElementById('protein-entries');
  list.innerHTML = '';
  for (const e of entries) {
    const li = document.createElement('li');
    const time = new Date(e.ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span><span class="entry-time">${time}</span>${e.grams}g</span>`;
    const del = document.createElement('button');
    del.className = 'entry-del';
    del.textContent = '✕';
    del.onclick = async () => { await deleteProtein(db, e.id); renderProtein(); };
    li.appendChild(del);
    list.appendChild(li);
  }
}

async function renderWeight() {
  const latest = await getLatestWeight(db);
  const el = document.getElementById('weight-latest');
  if (latest) {
    const isToday = latest.date === todayStr();
    el.textContent = isToday
      ? `오늘 기록: ${latest.kg}kg ✓`
      : `최근 기록: ${latest.kg}kg (${latest.date})`;
  } else {
    el.textContent = '아직 기록이 없습니다. 아침 공복에 재는 게 가장 일관적이에요.';
  }
}

async function addProteinAmount(grams) {
  if (!grams || grams <= 0) return;
  await addProtein(db, todayStr(), grams);
  renderProtein();
}

function initToday() {
  document.querySelectorAll('.preset').forEach((btn) => {
    btn.onclick = () => addProteinAmount(Number(btn.dataset.grams));
  });

  document.getElementById('protein-add').onclick = () => {
    const input = document.getElementById('protein-input');
    addProteinAmount(Number(input.value));
    input.value = '';
  };

  document.getElementById('goal-edit').onclick = () => {
    const v = prompt('하루 단백질 목표 (g)', String(getGoal()));
    const n = Number(v);
    if (n > 0) { localStorage.setItem(GOAL_KEY, String(n)); renderProtein(); }
  };

  document.getElementById('weight-save').onclick = async () => {
    const input = document.getElementById('weight-input');
    const kg = Number(input.value);
    if (!kg || kg <= 0) return;
    await setWeight(db, todayStr(), kg);
    input.value = '';
    renderWeight();
  };

  renderProtein();
  renderWeight();
}
