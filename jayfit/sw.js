// JayFit service worker — network-first with cache fallback for offline use.
// Bump CACHE on every deploy so clients pick up new assets.
const CACHE = 'jayfit-v8';

// Cache storage is per-origin and every app shares one origin, so this worker must only
// ever delete its own keys — otherwise it evicts a sibling app's offline shell.
const isOwnCache = (key) => key.startsWith('jayfit-');
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './units.js',
  './today.js',
  './nutrition.js',
  './workout.js',
  './trends.js',
  './data.js',
  './vendor/chart.umd.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && isOwnCache(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // cache:'no-cache' forces ETag revalidation, bypassing GitHub Pages'
    // max-age=600 so a fresh deploy is picked up on the next launch.
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
