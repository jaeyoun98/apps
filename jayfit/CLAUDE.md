# CLAUDE.md — jayfit

Personal-use fitness tracker PWA for exactly one user (the repo owner).
Deployed at https://jaeyoun98.github.io/apps/jayfit/ via GitHub Pages.

## Conventions

- The service-worker cache version constant is `CACHE` in `sw.js`.
- **Privacy invariant**: all data lives in on-device browser storage. Never add analytics,
  external requests, or server calls. Backup story is JSON export/import only.

## Verification loop

Re-verified 2026-07-30 on WSL Linux with Playwright driving Chromium. Everything below
was exercised end to end; the earlier off-screen-Edge iframe harness is no longer needed.

- Serve locally: `python3 -m http.server <port> --bind 127.0.0.1` from this app's
  directory (not the repo root — the app expects to be the server root).
- Drive the app with Playwright directly. No harness page, and **do not override
  `confirm`/`alert`/`prompt`** — they surface as real dialogs the driver can accept or
  dismiss. IndexedDB writes, the `setInterval` session timer, service-worker
  registration, and vendored Chart.js all work here.
- Assert on stored state, not just the DOM: open the `jayfit` IndexedDB database, count
  the `protein` / `weight` / `session` / `sets` stores, then reload and re-check. A
  correct-looking DOM can hide a write that never committed.
- Layout check: sweep `getBoundingClientRect()` over every visible element against
  `innerWidth`. Activate each tab first — an inactive `.screen` measures as zero-size and
  is silently skipped — and start a session to reach the `#workout-active` UI, which is
  `hidden` until then.
- A service worker registered in the test profile serves stale CSS and fakes a failure.
  Clear it between runs: unregister everything from
  `navigator.serviceWorker.getRegistrations()`, then delete every key in `caches.keys()`.

## App-specific notes

- The `input[type=number]` flex-shrink fix (see root "Proven patterns") lives in
  `style.css`.
