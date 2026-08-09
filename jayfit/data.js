// JayFit data.js — JSON export/import (backup). Data never leaves the device otherwise.
const EXPORT_VERSION = 4;

async function exportData() {
  const payload = {
    app: 'jayfit',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      proteinGoal: getGoal(),
      restSec: getRestSec(),
      weightUnit: getWeightUnit(),
      nutritionConfig: getNutritionConfig(),
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
  const collections = ['protein', 'weight', 'session', 'sets'];
  const hasValidCollections = collections.every((name) => Array.isArray(payload[name]));
  const nutritionConfig = payload.settings && payload.settings.nutritionConfig;
  const hasVersion = Object.prototype.hasOwnProperty.call(payload, 'version');
  const backupVersion = hasVersion && Number.isInteger(payload.version) && payload.version >= 1
    ? payload.version
    : 0;
  if (payload.app !== 'jayfit' || !hasValidCollections) {
    alert('JayFit 백업 파일이 아닙니다.');
    return;
  }
  if (hasVersion && backupVersion === 0) {
    alert('백업 버전 정보가 올바르지 않습니다.');
    return;
  }
  if (backupVersion > EXPORT_VERSION) {
    alert('현재 앱보다 새로운 버전에서 만든 백업입니다. 앱을 먼저 업데이트해주세요.');
    return;
  }
  if ((backupVersion >= 4 && !nutritionConfig) || (nutritionConfig && !isValidNutritionConfig(nutritionConfig))) {
    alert('백업의 식단 설정을 읽을 수 없습니다.');
    return;
  }
  if (!confirm('기존 기록을 모두 이 백업으로 교체합니다. 계속할까요?')) return;

  for (const name of collections) {
    await clearStore(db, name);
    await putAll(db, name, payload[name] || []);
  }
  if (payload.settings) {
    if (payload.settings.proteinGoal) localStorage.setItem(GOAL_KEY, String(payload.settings.proteinGoal));
    if (payload.settings.restSec) localStorage.setItem(REST_KEY, String(payload.settings.restSec));
    if (payload.settings.weightUnit === 'kg' || payload.settings.weightUnit === 'lb') {
      setWeightUnit(payload.settings.weightUnit);
    }
    if (nutritionConfig) setNutritionConfig(nutritionConfig);
  }

  alert('가져오기 완료!');
  renderProtein();
  renderWeight();
  renderNutrition();
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
