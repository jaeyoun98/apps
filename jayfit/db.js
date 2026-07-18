// jayfit db.js — IndexedDB wrapper. 데이터는 이 기기(폰) 안에만 저장된다.
const DB_NAME = 'jayfit';
const DB_VER = 1;

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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const result = fn(s);
    t.oncomplete = () => resolve(result.result !== undefined ? result.result : result);
    t.onerror = () => reject(t.error);
  });
}

function addProtein(db, date, grams) {
  return tx(db, 'protein', 'readwrite', (s) => s.add({ date, grams, ts: Date.now() }));
}

function deleteProtein(db, id) {
  return tx(db, 'protein', 'readwrite', (s) => s.delete(id));
}

function getProteinByDate(db, date) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('protein', 'readonly');
    const idx = t.objectStore('protein').index('date');
    const req = idx.getAll(date);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function setWeight(db, date, kg) {
  return tx(db, 'weight', 'readwrite', (s) => s.put({ date, kg, ts: Date.now() }));
}

function getLatestWeight(db) {
  return new Promise((resolve, reject) => {
    const t = db.transaction('weight', 'readonly');
    const req = t.objectStore('weight').openCursor(null, 'prev');
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}
