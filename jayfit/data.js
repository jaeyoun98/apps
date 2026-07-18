// JayFit data.js — JSON export/import (backup). Data never leaves the device otherwise.
const EXPORT_VERSION = 2;

async function exportData() {
  const payload = {
    app: 'jayfit',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      proteinGoal: getGoal(),
      restSec: getRestSec(),
    },
    protein: await getAllProtein(db),
    weight: await getAllWeight(db),
    session: await getAllSessions(db),
    sets: await getAllSets(db),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jayfit-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    alert('JSON 파일을 읽을 수 없습니다.');
    return;
  }
  if (payload.app !== 'jayfit' || !Array.isArray(payload.protein)) {
    alert('JayFit 백업 파일이 아닙니다.');
    return;
  }
  if (!confirm('기존 기록을 모두 이 백업으로 교체합니다. 계속할까요?')) return;

  for (const name of ['protein', 'weight', 'session', 'sets']) {
    await clearStore(db, name);
    await putAll(db, name, payload[name] || []);
  }
  if (payload.settings) {
    if (payload.settings.proteinGoal) localStorage.setItem(GOAL_KEY, String(payload.settings.proteinGoal));
    if (payload.settings.restSec) localStorage.setItem(REST_KEY, String(payload.settings.restSec));
  }

  alert('가져오기 완료!');
  renderProtein();
  renderWeight();
  renderTrends();
}

function initData() {
  document.getElementById('data-export').onclick = exportData;
  document.getElementById('data-import-btn').onclick = () => {
    document.getElementById('data-import-file').click();
  };
  document.getElementById('data-import-file').onchange = (e) => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  };
}
