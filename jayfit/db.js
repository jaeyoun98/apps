// JayFit db.js — thin IndexedDB wrapper.
// All data lives on-device only; nothing is ever sent to a server.
//
// Stores (DB_VER 2):
//   protein  {id auto, date 'YYYY-MM-DD', grams, ts}          index: date
//   weight   {date 'YYYY-MM-DD' (key), kg, ts}
//   session  {id auto, date 'YYYY-MM-DD', start ts, end ts|null}
//   sets     {id auto, sessionId, exercise, weight, reps, ts} index: sessionId, exercise

const DB_NAME = 'jayfit';
const DB_VER = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('protein')) {
        const s = db.createObjectStore('protein', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('weight')) {
        db.createObjectStore('weight', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sets')) {
        const s = db.createObjectStore('sets', { keyPath: 'id', autoIncrement: true });
        s.createIndex('sessionId', 'sessionId');
        s.createIndex('exercise', 'exercise');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Wrap a single IDBRequest in a promise.
function reqp(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeRO(db, name) { return db.transaction(name, 'readonly').objectStore(name); }
function storeRW(db, name) { return db.transaction(name, 'readwrite').objectStore(name); }

// --- protein ---
function addProtein(db, date, grams) {
  return reqp(storeRW(db, 'protein').add({ date, grams, ts: Date.now() }));
}
function deleteProtein(db, id) { return reqp(storeRW(db, 'protein').delete(id)); }
function getProteinByDate(db, date) {
  return reqp(storeRO(db, 'protein').index('date').getAll(date));
}
function getAllProtein(db) { return reqp(storeRO(db, 'protein').getAll()); }

// --- weight ---
function setWeight(db, date, kg) {
  return reqp(storeRW(db, 'weight').put({ date, kg, ts: Date.now() }));
}
function getAllWeight(db) { return reqp(storeRO(db, 'weight').getAll()); }
function deleteWeight(db, date) { return reqp(storeRW(db, 'weight').delete(date)); }
function getLatestWeight(db) {
  return new Promise((resolve, reject) => {
    const req = storeRO(db, 'weight').openCursor(null, 'prev');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// --- session ---
function addSession(db, date, start) {
  return reqp(storeRW(db, 'session').add({ date, start, end: null }));
}
function endSession(db, id, end) {
  const s = storeRW(db, 'session');
  return reqp(s.get(id)).then((sess) => {
    sess.end = end;
    return reqp(storeRW(db, 'session').put(sess));
  });
}
function getAllSessions(db) { return reqp(storeRO(db, 'session').getAll()); }
// Delete a session together with all of its sets.
async function deleteSessionCascade(db, sessionId) {
  const sets = await getSetsBySession(db, sessionId);
  for (const s of sets) await deleteSet(db, s.id);
  return reqp(storeRW(db, 'session').delete(sessionId));
}
async function getActiveSession(db) {
  const all = await getAllSessions(db);
  return all.find((s) => !s.end) || null;
}

// --- sets ---
function addSet(db, rec) { return reqp(storeRW(db, 'sets').add(rec)); }
function deleteSet(db, id) { return reqp(storeRW(db, 'sets').delete(id)); }
function getSetsBySession(db, sessionId) {
  return reqp(storeRO(db, 'sets').index('sessionId').getAll(sessionId));
}
function getAllSets(db) { return reqp(storeRO(db, 'sets').getAll()); }
// Most recent set of a given exercise across all sessions (for prefill).
function getLastSetByExercise(db, exercise) {
  return new Promise((resolve, reject) => {
    const req = storeRO(db, 'sets').index('exercise')
      .openCursor(IDBKeyRange.only(exercise), 'prev');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

// --- bulk (for import/export) ---
function clearStore(db, name) { return reqp(storeRW(db, name).clear()); }
function putAll(db, name, records) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(name, 'readwrite');
    const s = t.objectStore(name);
    records.forEach((r) => s.put(r));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
