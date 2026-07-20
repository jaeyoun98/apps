// JayFit units.js — display/input conversion. IndexedDB values always stay in kg.
const UNIT_KEY = 'jayfit.weightUnit';
const KG_PER_LB = 0.45359237;
const KG_STORAGE_SCALE = 1000;

function getWeightUnit() {
  return localStorage.getItem(UNIT_KEY) === 'lb' ? 'lb' : 'kg';
}

function toKg(value, unit = getWeightUnit()) {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

function toCanonicalKg(value, unit = getWeightUnit()) {
  return Math.round(toKg(value, unit) * KG_STORAGE_SCALE) / KG_STORAGE_SCALE;
}

function fromKg(value, unit = getWeightUnit()) {
  return unit === 'lb' ? value / KG_PER_LB : value;
}

function roundForInput(value) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatWeight(kg) {
  const unit = getWeightUnit();
  return `${roundForInput(fromKg(kg, unit)).toLocaleString()}${unit}`;
}

function formatVolume(kg) {
  return `${Math.round(fromKg(kg)).toLocaleString()}${getWeightUnit()}`;
}

function syncUnitUI() {
  const unit = getWeightUnit();
  document.querySelectorAll('[data-unit-toggle]').forEach((btn) => {
    btn.textContent = unit;
    btn.setAttribute('aria-label', `현재 무게 단위 ${unit}. 탭해서 변경`);
  });
  document.querySelectorAll('[data-weight-unit]').forEach((el) => { el.textContent = unit; });
  document.querySelectorAll('[data-unit-input]').forEach((input) => {
    input.step = input.dataset[`step${unit === 'kg' ? 'Kg' : 'Lb'}`];
    input.placeholder = `${input.dataset.placeholder} (${unit})`;
  });
}

function setWeightUnit(nextUnit) {
  if (nextUnit !== 'kg' && nextUnit !== 'lb') return;
  const previousUnit = getWeightUnit();
  if (previousUnit === nextUnit) { syncUnitUI(); return; }

  document.querySelectorAll('[data-unit-input]').forEach((input) => {
    const value = Number(input.value);
    if (String(input.value).trim() && Number.isFinite(value)) {
      input.value = roundForInput(fromKg(toKg(value, previousUnit), nextUnit));
    }
  });
  localStorage.setItem(UNIT_KEY, nextUnit);
  syncUnitUI();
  document.dispatchEvent(new CustomEvent('weightunitchange', {
    detail: { previousUnit, unit: nextUnit },
  }));
}

function initUnits() {
  document.querySelectorAll('[data-unit-toggle]').forEach((btn) => {
    btn.onclick = () => setWeightUnit(getWeightUnit() === 'kg' ? 'lb' : 'kg');
  });
  syncUnitUI();
}
