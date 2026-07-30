// JayFit app.js — bootstrap: open DB, wire up tabs, init screens, register SW.
let db;

function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.screen).classList.add('active');
      if (btn.dataset.screen === 'screen-trends') renderTrends();
    };
  });
}

async function main() {
  const d = new Date();
  document.getElementById('today-date').textContent =
    d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  db = await openDB();
  initTabs();
  initUnits();
  initToday();
  initWorkout();
  initTrends();
  initData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
}

main();
