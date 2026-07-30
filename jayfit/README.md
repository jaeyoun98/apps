# JayFit

Personal fitness tracker PWA — protein intake, body weight, and workout logging.
Built for exactly one user; UI text is Korean, everything else is English.

- **Stack**: vanilla HTML/CSS/JS + IndexedDB, Chart.js (vendored). No server, no accounts —
  all data stays on the device. JSON export/import is the backup story.
- **Hosting**: GitHub Pages. Push to `main` → auto deploy → https://jaeyoun98.github.io/apps/jayfit/
- **Install**: open in iPhone Safari → Share → "Add to Home Screen" (keep "Open as Web App" on).

## Structure

| File | Role |
|---|---|
| `index.html` | single page, three tab screens (Today / Workout / Trends) |
| `style.css` | dark theme, mobile-first |
| `db.js` | IndexedDB wrapper (protein / weight / session / sets stores) |
| `units.js` | canonical kg storage + kg/lb input/display conversion |
| `today.js` | protein counter + body-weight log |
| `workout.js` | background-safe timers, set logging with prefill and steppers |
| `trends.js` | weight/protein trends, weekly volume + set count, PRs, history |
| `data.js` | JSON export/import |
| `app.js` | bootstrap + tab routing |
| `sw.js` | service worker (network-first, offline fallback) — bump `CACHE` per deploy |

## Roadmap

- v0.1 — Today: protein counter (progress ring, presets), weight log ✅
- v0.2 — Workout: session timer, per-exercise set/rep/weight logging, rest timer ✅
- v0.3 — Trends: weight moving average, protein bars, weekly volume, PRs, session history ✅
- v0.4 — JSON export/import ✅
- Next: driven by real-use feedback
