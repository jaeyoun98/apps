// JayFit trends.js — Trends screen: weight trend, protein bars, weekly volume, PRs, history.
// Chart colors come from the validated dark palette (series blue #3987e5, neutral #898781);
// contrast vs the card surface (#1a1d24) verified >= 3:1.
const C_SERIES = '#3987e5';
const C_NEUTRAL = '#898781';
const C_GRID = '#262a33';
const C_INK = '#8b90a0';

let charts = {}; // canvas id -> Chart instance

function fmtDateShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function makeChart(canvasId, config) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext('2d');
  charts[canvasId] = new Chart(ctx, config);
}

function baseScales(opts = {}) {
  return {
    x: {
      grid: { display: false },
      ticks: { color: C_INK, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
      border: { color: C_GRID },
    },
    y: {
      grid: { color: C_GRID },
      ticks: { color: C_INK, maxTicksLimit: 5 },
      border: { display: false },
      beginAtZero: opts.zero || false,
    },
  };
}

// --- weight: raw entries as neutral dots + 28-day trailing average line ---
async function renderWeightChart() {
  const entries = (await getAllWeight(db)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const recent = entries.slice(-90);
  const unit = getWeightUnit();
  const empty = document.getElementById('weight-empty');
  empty.hidden = recent.length >= 2;
  if (recent.length < 2) {
    if (charts['chart-weight']) { charts['chart-weight'].destroy(); charts['chart-weight'] = null; }
    return;
  }

  const DAY = 86400000;
  const ma = recent.map((e) => {
    const t = new Date(e.date).getTime();
    const win = recent.filter((x) => {
      const xt = new Date(x.date).getTime();
      return xt <= t && xt > t - 28 * DAY;
    });
    return fromKg(win.reduce((s, x) => s + x.kg, 0) / win.length, unit);
  });

  makeChart('chart-weight', {
    type: 'line',
    data: {
      labels: recent.map((e) => fmtDateShort(e.date)),
      datasets: [
        {
          label: `체중 (${unit})`,
          data: recent.map((e) => roundForInput(fromKg(e.kg, unit))),
          showLine: false,
          pointRadius: 4,
          pointBackgroundColor: C_NEUTRAL,
        },
        {
          label: `28일 평균 (${unit})`,
          data: ma.map(roundForInput),
          borderColor: C_SERIES,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: baseScales(),
      plugins: {
        legend: { labels: { color: C_INK, boxWidth: 12, boxHeight: 12 } },
      },
    },
  });
}

// --- protein: daily bars for the last 14 days + goal reference line ---
async function renderProteinChart() {
  const all = await getAllProtein(db);
  const byDate = new Map();
  all.forEach((e) => byDate.set(e.date, (byDate.get(e.date) || 0) + e.grams));

  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const p = (n) => String(n).padStart(2, '0');
    days.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  }
  const goal = getGoal();

  makeChart('chart-protein', {
    type: 'bar',
    data: {
      labels: days.map(fmtDateShort),
      datasets: [
        {
          label: '단백질 (g)',
          data: days.map((d) => byDate.get(d) || 0),
          backgroundColor: C_SERIES,
          borderRadius: 4,
          maxBarThickness: 18,
        },
        {
          label: `목표 ${goal}g`,
          type: 'line',
          data: days.map(() => goal),
          borderColor: C_NEUTRAL,
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: baseScales({ zero: true }),
      plugins: {
        legend: { labels: { color: C_INK, boxWidth: 12, boxHeight: 12 } },
      },
    },
  });
}

// --- volume: total (weight x reps) per week, last 8 weeks ---
function mondayOf(ts) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return mon.getTime();
}

async function renderVolumeChart() {
  const sets = await getAllSets(db);
  const empty = document.getElementById('volume-empty');
  empty.hidden = sets.length > 0;
  if (!sets.length) {
    if (charts['chart-volume']) { charts['chart-volume'].destroy(); charts['chart-volume'] = null; }
    return;
  }

  const WEEK = 7 * 86400000;
  const thisMon = mondayOf(Date.now());
  const unit = getWeightUnit();
  const labels = [];
  const volumeData = [];
  const setCountData = [];
  for (let i = 7; i >= 0; i--) {
    const start = thisMon - i * WEEK;
    const end = start + WEEK;
    const weeklySets = sets.filter((s) => s.ts >= start && s.ts < end);
    const volumeKg = weeklySets.reduce((v, s) => v + s.weight * s.reps, 0);
    const d = new Date(start);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}~`);
    volumeData.push(Math.round(fromKg(volumeKg, unit)));
    setCountData.push(weeklySets.length);
  }

  const scales = baseScales({ zero: true });
  scales.ySets = {
    position: 'right',
    beginAtZero: true,
    grid: { drawOnChartArea: false },
    ticks: { color: C_INK, maxTicksLimit: 5, precision: 0 },
    border: { display: false },
  };

  makeChart('chart-volume', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: `볼륨 (${unit})`,
          data: volumeData,
          yAxisID: 'y',
          backgroundColor: C_SERIES,
          borderRadius: 4,
          maxBarThickness: 24,
        },
        {
          label: '세트 수',
          type: 'line',
          data: setCountData,
          yAxisID: 'ySets',
          borderColor: C_NEUTRAL,
          backgroundColor: C_NEUTRAL,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: C_INK, boxWidth: 12, boxHeight: 12 } },
      },
    },
  });
}

// --- per-exercise best set (highest weight; reps break ties) ---
async function renderPRs() {
  const sets = await getAllSets(db);
  const best = new Map();
  for (const s of sets) {
    const cur = best.get(s.exercise);
    if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
      best.set(s.exercise, s);
    }
  }
  const list = document.getElementById('pr-list');
  list.innerHTML = '';
  if (!best.size) {
    list.innerHTML = '<li class="muted">운동 세트를 기록하면 최고 기록이 쌓입니다.</li>';
    return;
  }
  [...best.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .forEach(([exercise, s]) => {
      const li = document.createElement('li');
      const date = new Date(s.ts);
      li.innerHTML = `<span>${exercise}</span><span class="pr-val">${formatWeight(s.weight)} × ${s.reps} <span class="entry-time">${date.getMonth() + 1}/${date.getDate()}</span></span>`;
      list.appendChild(li);
    });
}

// --- session history (latest first) ---
async function renderHistory() {
  const sessions = (await getAllSessions(db)).filter((s) => s.end);
  const sets = await getAllSets(db);
  const list = document.getElementById('session-history');
  list.innerHTML = '';
  if (!sessions.length) {
    list.innerHTML = '<li class="muted">완료한 운동이 여기 쌓입니다.</li>';
    return;
  }
  sessions.sort((a, b) => b.start - a.start).slice(0, 20).forEach((sess) => {
    const mySets = sets.filter((s) => s.sessionId === sess.id);
    const vol = mySets.reduce((v, s) => v + s.weight * s.reps, 0);
    const li = document.createElement('li');
    li.innerHTML =
      `<span>${sess.date}</span>` +
      `<span class="pr-val">${fmtDuration(sess.end - sess.start)} · ${mySets.length}세트 · ${formatVolume(vol)}</span>`;
    const del = document.createElement('button');
    del.className = 'entry-del';
    del.textContent = '✕';
    del.onclick = async () => {
      if (!confirm(`${sess.date} 운동 기록(${mySets.length}세트)을 삭제할까요?`)) return;
      await deleteSessionCascade(db, sess.id);
      renderTrends();
    };
    li.appendChild(del);
    list.appendChild(li);
  });
}

function renderTrends() {
  renderWeightChart();
  renderProteinChart();
  renderVolumeChart();
  renderPRs();
  renderHistory();
}

function initTrends() {
  Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  Chart.defaults.color = C_INK;
  document.addEventListener('weightunitchange', renderTrends);
}
