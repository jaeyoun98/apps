# CLAUDE.md — jayfit

Personal-use fitness tracker PWA for exactly one user (the repo owner).
Deployed at https://jaeyoun98.github.io/jayfit/ via GitHub Pages.

## Conventions

- **Language**: code, comments, README, and commit messages in English.
  **User-facing UI text in Korean.**
- **Deploy** = push to `main` (Pages auto-deploys). **Bump `CACHE` in `sw.js` on every
  deploy** that changes any cached asset — clients hold the old cache otherwise.
- **App name / icon changes require the user to reinstall** the home-screen app
  (iOS bakes them in at install time). Warn the user before changing either.
- **Privacy invariant**: all data lives in on-device IndexedDB. Never add analytics,
  external requests, or server calls. Backup story is JSON export/import only.
- Keep the stack dependency-free: vanilla JS, vendored libs only (`vendor/`).

## Verification loop (Windows, no Node)

- Serve locally: `py -m http.server <port>` from the repo root.
- Drive the app with an iframe test harness page (temporary, never commit it):
  override `confirm`/`alert`, click through flows, report results by `fetch()`ing
  a marker URL — read it back from the http.server log.
- Run the harness in **headed Edge positioned off-screen** (`--window-position=-32000,-32000`,
  fresh `--user-data-dir`). Headless Edge is unreliable here: `--virtual-time-budget`
  starves IndexedDB, and plain headless exits before timers fire.
- Layout check: scan `getBoundingClientRect()` of all elements at 402px (iPhone 16 Pro)
  and 320px widths for viewport overflow. Beware stale service-worker caches in test
  profiles — reuse of a `--user-data-dir` can serve old CSS and fake a failure.

## iOS quirks already encountered

- `input[type=number]` intrinsic min-width defeats flex shrinking on iOS WebKit →
  fixed with `width: 0` + `flex-basis: 0` + container `min-width: 0` (style.css).
- GitHub Pages serves `Cache-Control: max-age=600` → `sw.js` fetches with
  `cache: 'no-cache'` (ETag revalidation) so a new deploy lands on next launch.
- iOS applies fetched updates on the **next** full launch: close app (swipe away),
  reopen — sometimes twice right after a deploy.
