# CLAUDE.md — jayfit

Personal-use fitness tracker PWA for exactly one user (the repo owner).
Deployed at https://jaeyoun98.github.io/apps/jayfit/ via GitHub Pages.

## Conventions

- The service-worker cache version constant is `CACHE` in `sw.js`.
- **Privacy invariant**: all data lives in on-device IndexedDB. Never add analytics,
  external requests, or server calls. Backup story is JSON export/import only.

## Verification loop (Windows, no Node)

- Serve locally: `py -m http.server <port>` from this app's directory (not the repo root —
  the app expects to be the server root).
- Drive the app with an iframe test harness page (temporary, never commit it):
  override `confirm`/`alert`, click through flows, report results by `fetch()`ing
  a marker URL — read it back from the http.server log.
- Run the harness in **headed Edge positioned off-screen** (`--window-position=-32000,-32000`,
  fresh `--user-data-dir`). Headless Edge is unreliable here: `--virtual-time-budget`
  starves IndexedDB, and plain headless exits before timers fire.
- Layout check: scan `getBoundingClientRect()` of all elements for viewport overflow.
  Beware stale service-worker caches in test profiles — reuse of a `--user-data-dir`
  can serve old CSS and fake a failure.

## App-specific notes

- The `input[type=number]` flex-shrink fix (see root "Proven patterns") lives in
  `style.css`.
