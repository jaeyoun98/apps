"use strict";

// Bump VERSION on every deploy that changes a cached asset, or clients keep serving the
// old copy. APP must be unique across apps: cache storage is per-origin and every app
// shares one origin, so this worker must only ever delete its own keys — otherwise it
// evicts a sibling app's offline shell.
const APP = "newapp";
const VERSION = "v1";
const CACHE = `${APP}-${VERSION}`;
const isOwnCache = (key) => key.startsWith(`${APP}-`);
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && isOwnCache(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    // cache:'no-cache' forces ETag revalidation, bypassing GitHub Pages'
    // max-age=600 so a fresh deploy is picked up on the next launch.
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        // never cache an error response — it would poison the offline fallback
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
