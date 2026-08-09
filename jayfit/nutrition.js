// JayFit nutrition.js — configurable meal planner stored entirely on-device.
// This is a plan, not an intake log. Existing protein entries remain the source
// of truth for what was actually consumed.

const NUTRITION_KEY = 'jayfit.nutritionConfig.v1';
const NUTRITION_VERSION = 1;
const NUTRIENTS = ['kcal', 'carbs', 'protein', 'fat', 'fiber'];
const SERVING_OPTIONS = [0.5, 1, 1.5, 2];

const DEFAULT_NUTRITION_CONFIG = {
  version: NUTRITION_VERSION,
  dailyTarget: { kcal: 2500, carbs: 315, protein: 150, fat: 70, fiber: 32 },
  foods: [
    { id: 'food-rice', name: '밥', serving: '140g (조리 후)', kcal: 210, carbs: 46, protein: 4, fat: 0.4, fiber: 0.5 },
    { id: 'food-oats', name: '오트밀', serving: '60g (건조)', kcal: 228, carbs: 40, protein: 8, fat: 4, fiber: 6 },
    { id: 'food-banana', name: '바나나', serving: '중간 크기 1개', kcal: 105, carbs: 27, protein: 1.3, fat: 0.4, fiber: 3.1 },
    { id: 'food-apple', name: '사과', serving: '껍질째 1개', kcal: 95, carbs: 25, protein: 0.5, fat: 0.3, fiber: 4.4 },
    { id: 'food-chicken', name: '닭가슴살', serving: '100g (조리 후)', kcal: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0 },
    { id: 'food-egg', name: '달걀', serving: '1개', kcal: 70, carbs: 0.4, protein: 6, fat: 5, fiber: 0 },
    { id: 'food-tofu', name: '두부', serving: '100g', kcal: 80, carbs: 2, protein: 8, fat: 5, fiber: 0.5 },
    { id: 'food-milk', name: '우유', serving: '250ml', kcal: 120, carbs: 12, protein: 8, fat: 5, fiber: 0 },
    { id: 'food-peanuts', name: '무염 구운 땅콩', serving: '20g', kcal: 113, carbs: 3.2, protein: 5.2, fat: 9.8, fiber: 1.7 },
    { id: 'food-chickpeas', name: '병아리콩', serving: '100g (캔 물기 제거)', kcal: 139, carbs: 22.5, protein: 7.1, fat: 2.6, fiber: 6.4 },
    { id: 'food-broccoli', name: '냉동 브로콜리', serving: '200g', kcal: 68, carbs: 13, protein: 5.6, fat: 0.8, fiber: 5.2 },
  ],
  slots: [
    {
      id: 'slot-breakfast', label: '아침',
      target: { kcal: 600, carbs: 75, protein: 30, fat: 15, fiber: 8 },
      items: [
        { id: 'item-breakfast-oats', foodId: 'food-oats', servings: 1 },
        { id: 'item-breakfast-eggs', foodId: 'food-egg', servings: 2 },
        { id: 'item-breakfast-milk', foodId: 'food-milk', servings: 1 },
        { id: 'item-breakfast-banana', foodId: 'food-banana', servings: 1 },
      ],
    },
    {
      id: 'slot-lunch', label: '점심',
      target: { kcal: 650, carbs: 90, protein: 40, fat: 15, fiber: 8 },
      items: [
        { id: 'item-lunch-rice', foodId: 'food-rice', servings: 1.5 },
        { id: 'item-lunch-chicken', foodId: 'food-chicken', servings: 2 },
        { id: 'item-lunch-broccoli', foodId: 'food-broccoli', servings: 1 },
      ],
    },
    {
      id: 'slot-workout', label: '운동 전후',
      target: { kcal: 350, carbs: 50, protein: 25, fat: 5, fiber: 3 },
      items: [
        { id: 'item-workout-milk', foodId: 'food-milk', servings: 1 },
        { id: 'item-workout-banana', foodId: 'food-banana', servings: 1 },
      ],
    },
    {
      id: 'slot-dinner-1', label: '저녁 1',
      target: { kcal: 500, carbs: 60, protein: 30, fat: 15, fiber: 6 },
      items: [
        { id: 'item-dinner1-rice', foodId: 'food-rice', servings: 1 },
        { id: 'item-dinner1-tofu', foodId: 'food-tofu', servings: 2 },
        { id: 'item-dinner1-chickpeas', foodId: 'food-chickpeas', servings: 1 },
      ],
    },
    {
      id: 'slot-dinner-2', label: '저녁 2',
      target: { kcal: 400, carbs: 40, protein: 25, fat: 20, fiber: 7 },
      items: [
        { id: 'item-dinner2-rice', foodId: 'food-rice', servings: 1 },
        { id: 'item-dinner2-tofu', foodId: 'food-tofu', servings: 2 },
        { id: 'item-dinner2-egg', foodId: 'food-egg', servings: 1 },
        { id: 'item-dinner2-broccoli', foodId: 'food-broccoli', servings: 1 },
      ],
    },
  ],
};

let nutritionConfig;
let selectedNutritionSlotId;
let editingNutritionFoodId = null;
let nutritionIdCounter = 0;

function cloneNutritionDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_NUTRITION_CONFIG));
}

function newNutritionId(prefix) {
  nutritionIdCounter += 1;
  return `${prefix}-${Date.now()}-${nutritionIdCounter}`;
}

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidNutritionConfig(raw) {
  if (!raw || raw.version !== NUTRITION_VERSION) return false;
  if (!Array.isArray(raw.foods) || !Array.isArray(raw.slots)) return false;
  if (raw.slots.length < 3 || raw.slots.length > 6) return false;
  if (!raw.dailyTarget || !NUTRIENTS.every((key) => finiteNonNegative(raw.dailyTarget[key]))) return false;

  const foodIds = new Set();
  for (const food of raw.foods) {
    if (!food || typeof food.id !== 'string' || !food.id || foodIds.has(food.id)) return false;
    if (typeof food.name !== 'string' || !food.name.trim()) return false;
    if (typeof food.serving !== 'string' || !food.serving.trim()) return false;
    if (!NUTRIENTS.every((key) => finiteNonNegative(food[key]))) return false;
    foodIds.add(food.id);
  }

  const slotIds = new Set();
  const itemIds = new Set();
  for (const slot of raw.slots) {
    if (!slot || typeof slot.id !== 'string' || !slot.id || slotIds.has(slot.id)) return false;
    if (typeof slot.label !== 'string' || !slot.label.trim()) return false;
    if (!slot.target || !NUTRIENTS.every((key) => finiteNonNegative(slot.target[key]))) return false;
    if (!Array.isArray(slot.items)) return false;
    slotIds.add(slot.id);

    for (const item of slot.items) {
      if (!item || typeof item.id !== 'string' || !item.id || itemIds.has(item.id)) return false;
      if (!foodIds.has(item.foodId) || typeof item.servings !== 'number' || !SERVING_OPTIONS.includes(item.servings)) return false;
      itemIds.add(item.id);
    }
  }
  return true;
}

function loadNutritionConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NUTRITION_KEY));
    if (isValidNutritionConfig(parsed)) return parsed;
  } catch {
    // Fall through to a clean starter template.
  }
  return cloneNutritionDefaults();
}

function getNutritionConfig() {
  return JSON.parse(JSON.stringify(nutritionConfig));
}

function setNutritionConfig(raw) {
  if (!isValidNutritionConfig(raw)) return false;
  nutritionConfig = JSON.parse(JSON.stringify(raw));
  selectedNutritionSlotId = nutritionConfig.slots[0].id;
  if (document.getElementById('nutrition-food-name')) clearNutritionFoodForm();
  saveNutritionConfig();
  renderNutrition();
  return true;
}

function saveNutritionConfig() {
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(nutritionConfig));
}

function getSelectedNutritionSlot() {
  let slot = nutritionConfig.slots.find((item) => item.id === selectedNutritionSlotId);
  if (!slot) {
    slot = nutritionConfig.slots[0];
    selectedNutritionSlotId = slot.id;
  }
  return slot;
}

function emptyNutritionTotals() {
  return { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };
}

function addNutritionTotals(total, values, multiplier = 1) {
  NUTRIENTS.forEach((key) => { total[key] += Number(values[key]) * multiplier; });
  return total;
}

function targetTotals() {
  return { ...nutritionConfig.dailyTarget };
}

function slotTargetTotals() {
  return nutritionConfig.slots.reduce(
    (total, slot) => addNutritionTotals(total, slot.target),
    emptyNutritionTotals(),
  );
}

function plannedTotalsForSlot(slot) {
  const byId = new Map(nutritionConfig.foods.map((food) => [food.id, food]));
  return slot.items.reduce((total, item) => {
    const food = byId.get(item.foodId);
    return food ? addNutritionTotals(total, food, item.servings) : total;
  }, emptyNutritionTotals());
}

function plannedTotals() {
  return nutritionConfig.slots.reduce(
    (total, slot) => addNutritionTotals(total, plannedTotalsForSlot(slot)),
    emptyNutritionTotals(),
  );
}

function fmtNutrition(value, key) {
  return key === 'kcal' ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
}

function nutritionLabel(key) {
  return ({ kcal: 'kcal', carbs: '탄수화물', protein: '단백질', fat: '지방', fiber: '식이섬유' })[key];
}

function renderNutritionSummary() {
  const target = targetTotals();
  const allocation = slotTargetTotals();
  const planned = plannedTotals();
  document.getElementById('nutrition-kcal-planned').textContent = fmtNutrition(planned.kcal, 'kcal');
  document.getElementById('nutrition-kcal-target').textContent = fmtNutrition(target.kcal, 'kcal');

  const grid = document.getElementById('nutrition-macro-grid');
  grid.replaceChildren();
  ['carbs', 'protein', 'fat', 'fiber'].forEach((key) => {
    const item = document.createElement('div');
    item.className = 'nutrition-macro';

    const heading = document.createElement('div');
    heading.className = 'nutrition-macro-heading';
    const label = document.createElement('span');
    label.textContent = nutritionLabel(key);
    const value = document.createElement('span');
    value.textContent = `${fmtNutrition(planned[key], key)} / ${fmtNutrition(target[key], key)}g`;
    heading.append(label, value);

    const bar = document.createElement('div');
    bar.className = 'nutrition-progress';
    const fill = document.createElement('span');
    const ratio = target[key] ? planned[key] / target[key] : 0;
    fill.style.width = `${Math.min(ratio, 1) * 100}%`;
    if (ratio > 1.05) fill.classList.add('over');
    bar.appendChild(fill);
    item.append(heading, bar);
    grid.appendChild(item);
  });

  NUTRIENTS.forEach((key) => {
    document.getElementById(`nutrition-daily-${key}`).value = fmtNutrition(target[key], key);
  });
  const differences = NUTRIENTS
    .map((key) => ({ key, value: allocation[key] - target[key] }))
    .filter(({ value }) => Math.abs(value) >= 0.1);
  const status = document.getElementById('nutrition-allocation-status');
  if (!differences.length) {
    status.textContent = '끼니별 목표 합계가 하루 목표와 일치합니다.';
    status.classList.remove('warning');
  } else {
    status.textContent = '끼니 배분 차이: ' + differences.map(({ key, value }) => {
      const direction = value > 0 ? '초과' : '미배분';
      const unit = key === 'kcal' ? ' kcal' : 'g';
      return `${nutritionLabel(key)} ${direction} ${fmtNutrition(Math.abs(value), key)}${unit}`;
    }).join(' · ');
    status.classList.add('warning');
  }
}

function renderNutritionSlots() {
  const selected = getSelectedNutritionSlot();
  const tabs = document.getElementById('nutrition-slot-tabs');
  tabs.replaceChildren();
  nutritionConfig.slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `nutrition-slot-chip${slot.id === selected.id ? ' active' : ''}`;
    button.textContent = slot.label;
    button.onclick = () => {
      selectedNutritionSlotId = slot.id;
      renderNutrition();
    };
    tabs.appendChild(button);
  });
  document.getElementById('nutrition-slot-count').textContent = `${nutritionConfig.slots.length}끼`;
  document.getElementById('nutrition-slot-name').textContent = selected.label;

  NUTRIENTS.forEach((key) => {
    document.getElementById(`nutrition-target-${key}`).value = fmtNutrition(selected.target[key], key);
  });

  const mergeButton = document.getElementById('nutrition-slot-merge');
  const splitButton = document.getElementById('nutrition-slot-split');
  mergeButton.disabled = nutritionConfig.slots.length <= 3;
  splitButton.disabled = nutritionConfig.slots.length >= 6;
}

function renderNutritionItems() {
  const slot = getSelectedNutritionSlot();
  const byId = new Map(nutritionConfig.foods.map((food) => [food.id, food]));
  const list = document.getElementById('nutrition-planned-items');
  list.replaceChildren();

  if (!slot.items.length) {
    const empty = document.createElement('li');
    empty.className = 'muted';
    empty.textContent = '아래 음식을 눌러 이 끼니에 추가하세요.';
    list.appendChild(empty);
  }

  slot.items.forEach((entry) => {
    const food = byId.get(entry.foodId);
    if (!food) return;
    const row = document.createElement('li');
    row.className = 'nutrition-plan-row';

    const textWrap = document.createElement('div');
    textWrap.className = 'nutrition-plan-text';
    const name = document.createElement('strong');
    name.textContent = food.name;
    const detail = document.createElement('span');
    detail.textContent = `${food.serving} · ${fmtNutrition(food.kcal * entry.servings, 'kcal')} kcal`;
    textWrap.append(name, detail);

    const controls = document.createElement('div');
    controls.className = 'nutrition-plan-controls';
    const select = document.createElement('select');
    select.setAttribute('aria-label', `${food.name} 섭취량`);
    SERVING_OPTIONS.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${value}×`;
      option.selected = value === Number(entry.servings);
      select.appendChild(option);
    });
    select.onchange = () => {
      entry.servings = Number(select.value);
      saveNutritionConfig();
      renderNutrition();
    };

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'entry-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `${food.name} 계획에서 삭제`);
    del.onclick = () => {
      slot.items = slot.items.filter((item) => item.id !== entry.id);
      saveNutritionConfig();
      renderNutrition();
    };
    controls.append(select, del);
    row.append(textWrap, controls);
    list.appendChild(row);
  });

  const totals = plannedTotalsForSlot(slot);
  document.getElementById('nutrition-slot-planned').textContent =
    `계획 ${fmtNutrition(totals.kcal, 'kcal')} kcal · ` +
    `C ${fmtNutrition(totals.carbs, 'carbs')} · P ${fmtNutrition(totals.protein, 'protein')} · ` +
    `F ${fmtNutrition(totals.fat, 'fat')} · 식이섬유 ${fmtNutrition(totals.fiber, 'fiber')}g`;
}

function renderNutritionCatalog() {
  const grid = document.getElementById('nutrition-food-catalog');
  grid.replaceChildren();
  nutritionConfig.foods.forEach((food) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nutrition-food-button';
    const name = document.createElement('strong');
    name.textContent = food.name;
    const serving = document.createElement('span');
    serving.textContent = `${food.serving} · ${fmtNutrition(food.kcal, 'kcal')} kcal`;
    button.append(name, serving);
    button.onclick = () => {
      getSelectedNutritionSlot().items.push({
        id: newNutritionId('item'), foodId: food.id, servings: 1,
      });
      saveNutritionConfig();
      renderNutrition();
    };
    grid.appendChild(button);
  });
}

function renderNutritionFoodManager() {
  const list = document.getElementById('nutrition-food-list');
  list.replaceChildren();
  nutritionConfig.foods.forEach((food) => {
    const row = document.createElement('li');
    const textWrap = document.createElement('div');
    textWrap.className = 'nutrition-plan-text';
    const name = document.createElement('strong');
    name.textContent = food.name;
    const detail = document.createElement('span');
    detail.textContent = `${food.serving} · ${fmtNutrition(food.kcal, 'kcal')} kcal`;
    textWrap.append(name, detail);

    const controls = document.createElement('div');
    controls.className = 'nutrition-manager-controls';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'link-btn nutrition-inline-btn';
    edit.textContent = '수정';
    edit.onclick = () => beginNutritionFoodEdit(food);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'entry-del';
    del.textContent = '✕';
    del.setAttribute('aria-label', `${food.name} 음식 삭제`);
    del.onclick = () => deleteNutritionFood(food);
    controls.append(edit, del);
    row.append(textWrap, controls);
    list.appendChild(row);
  });
}

function renderNutrition() {
  if (!document.getElementById('screen-nutrition')) return;
  renderNutritionSummary();
  renderNutritionSlots();
  renderNutritionItems();
  renderNutritionCatalog();
  renderNutritionFoodManager();
}

function saveSelectedSlotTargets() {
  const slot = getSelectedNutritionSlot();
  const next = {};
  for (const key of NUTRIENTS) {
    const input = document.getElementById(`nutrition-target-${key}`);
    if (!input.value.trim()) {
      alert('끼니 목표를 모두 입력해주세요.');
      return;
    }
    const value = Number(input.value);
    if (!finiteNonNegative(value)) return;
    next[key] = value;
  }
  slot.target = next;
  saveNutritionConfig();
  renderNutrition();
}

function saveDailyNutritionTarget() {
  const next = {};
  for (const key of NUTRIENTS) {
    const input = document.getElementById(`nutrition-daily-${key}`);
    if (!input.value.trim()) {
      alert('하루 목표를 모두 입력해주세요.');
      return;
    }
    const value = Number(input.value);
    if (!finiteNonNegative(value)) return;
    next[key] = value;
  }
  nutritionConfig.dailyTarget = next;
  saveNutritionConfig();
  renderNutrition();
}

function splitSelectedNutritionSlot() {
  if (nutritionConfig.slots.length >= 6) return;
  const index = nutritionConfig.slots.findIndex((slot) => slot.id === getSelectedNutritionSlot().id);
  const current = nutritionConfig.slots[index];
  const firstTarget = {};
  const secondTarget = {};
  NUTRIENTS.forEach((key) => {
    firstTarget[key] = Math.floor(Number(current.target[key]) / 2);
    secondTarget[key] = Number(current.target[key]) - firstTarget[key];
  });
  current.target = firstTarget;
  const splitAt = Math.ceil(current.items.length / 2);
  const next = {
    id: newNutritionId('slot'),
    label: '새 끼니',
    target: secondTarget,
    items: current.items.splice(splitAt),
  };
  nutritionConfig.slots.splice(index + 1, 0, next);
  selectedNutritionSlotId = next.id;
  saveNutritionConfig();
  renderNutrition();
}

function mergeSelectedNutritionSlot() {
  if (nutritionConfig.slots.length <= 3) return;
  const index = nutritionConfig.slots.findIndex((slot) => slot.id === getSelectedNutritionSlot().id);
  const otherIndex = index > 0 ? index - 1 : 1;
  const current = nutritionConfig.slots[index];
  const other = nutritionConfig.slots[otherIndex];
  const message = `"${current.label}"을(를) "${other.label}"과 합칠까요? 음식 계획도 함께 이동합니다.`;
  if (!confirm(message)) return;

  NUTRIENTS.forEach((key) => { other.target[key] = Number(other.target[key]) + Number(current.target[key]); });
  other.items.push(...current.items);
  nutritionConfig.slots.splice(index, 1);
  selectedNutritionSlotId = other.id;
  saveNutritionConfig();
  renderNutrition();
}

function renameSelectedNutritionSlot() {
  const slot = getSelectedNutritionSlot();
  const value = prompt('끼니 이름', slot.label);
  if (!value || !value.trim()) return;
  slot.label = value.trim().slice(0, 20);
  saveNutritionConfig();
  renderNutrition();
}

function foodFormValue(id) {
  return document.getElementById(id).value.trim();
}

function clearNutritionFoodForm() {
  editingNutritionFoodId = null;
  ['nutrition-food-name', 'nutrition-food-serving', 'nutrition-food-kcal', 'nutrition-food-carbs',
    'nutrition-food-protein', 'nutrition-food-fat', 'nutrition-food-fiber']
    .forEach((id) => { document.getElementById(id).value = ''; });
  document.getElementById('nutrition-food-save').textContent = '음식 추가';
  document.getElementById('nutrition-food-cancel').hidden = true;
}

function beginNutritionFoodEdit(food) {
  editingNutritionFoodId = food.id;
  document.getElementById('nutrition-food-name').value = food.name;
  document.getElementById('nutrition-food-serving').value = food.serving;
  NUTRIENTS.forEach((key) => {
    document.getElementById(`nutrition-food-${key}`).value = food[key];
  });
  document.getElementById('nutrition-food-save').textContent = '수정 저장';
  document.getElementById('nutrition-food-cancel').hidden = false;
  document.getElementById('nutrition-food-name').focus();
}

function saveNutritionFood() {
  const name = foodFormValue('nutrition-food-name');
  const serving = foodFormValue('nutrition-food-serving');
  const values = {};
  for (const key of NUTRIENTS) {
    const input = document.getElementById(`nutrition-food-${key}`);
    if (!input.value.trim()) {
      alert('영양 정보를 모두 입력해주세요.');
      return;
    }
    values[key] = Number(input.value);
  }
  if (!name || !serving || !NUTRIENTS.every((key) => finiteNonNegative(values[key]))) {
    alert('음식명·1회분·영양 정보를 모두 확인해주세요.');
    return;
  }

  const existing = nutritionConfig.foods.find((food) => food.id === editingNutritionFoodId);
  if (existing) {
    Object.assign(existing, { name, serving, ...values });
  } else {
    nutritionConfig.foods.push({ id: newNutritionId('food'), name, serving, ...values });
  }
  saveNutritionConfig();
  clearNutritionFoodForm();
  renderNutrition();
}

function deleteNutritionFood(food) {
  const used = nutritionConfig.slots.some((slot) => slot.items.some((item) => item.foodId === food.id));
  if (used) {
    alert(`"${food.name}"이(가) 끼니 계획에 사용 중입니다. 계획에서 먼저 삭제해주세요.`);
    return;
  }
  if (!confirm(`"${food.name}" 음식을 삭제할까요?`)) return;
  nutritionConfig.foods = nutritionConfig.foods.filter((item) => item.id !== food.id);
  if (editingNutritionFoodId === food.id) clearNutritionFoodForm();
  saveNutritionConfig();
  renderNutrition();
}

function initNutrition() {
  nutritionConfig = loadNutritionConfig();
  selectedNutritionSlotId = nutritionConfig.slots[0].id;

  document.getElementById('nutrition-target-save').onclick = saveSelectedSlotTargets;
  document.getElementById('nutrition-daily-save').onclick = saveDailyNutritionTarget;
  document.getElementById('nutrition-slot-split').onclick = splitSelectedNutritionSlot;
  document.getElementById('nutrition-slot-merge').onclick = mergeSelectedNutritionSlot;
  document.getElementById('nutrition-slot-rename').onclick = renameSelectedNutritionSlot;
  document.getElementById('nutrition-food-save').onclick = saveNutritionFood;
  document.getElementById('nutrition-food-cancel').onclick = clearNutritionFoodForm;
  renderNutrition();
}
