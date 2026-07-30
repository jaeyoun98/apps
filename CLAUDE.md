# apps

Personal PWA monorepo. Every top-level directory is one self-contained app, deployed to
GitHub Pages under `https://jaeyoun98.github.io/apps/<app>/`.

| App | What it is |
|---|---|
| `jaybrief` | Stock-investing news feed + LLM decision-support briefings |
| `jayfit` | Fitness tracker (protein, body weight, workouts) |
| `_template` | Copy-on-create skeleton for a new app |

## Boundaries

- **Apps never import from each other and there is no shared runtime library.**
  Duplication across apps is accepted on purpose, so any single app can be redesigned
  or rewritten without regression-testing the others. `_template/` is a copy source at
  creation time only — editing it never affects an existing app.
- Share knowledge, not code: a solution proven in one app is recorded under
  "Proven patterns" and folded into `_template/`, never extracted into a shared module.
- Two apps deliberately diverge where their needs differ (e.g. service-worker caching
  strategy). Divergence is a design outcome, not drift to be cleaned up.

## Conventions

- UI strings: Korean. Code, comments, docs, commit messages: English.
- Commit messages: one-line imperative. No AI trailers (`Co-Authored-By` etc.) — the
  author is the user alone.
- Vanilla HTML/CSS/JS, no framework and no build step. Third-party libraries are
  vendored under `<app>/vendor/`, never loaded from a CDN.
- All asset and data paths relative (`./`) — every app is served from a subpath, so an
  absolute path like `/style.css` breaks it.
- Bump the app's service-worker cache version on every deploy that changes a cached
  asset; clients keep serving the old cache otherwise.
- Changing an app's display name or icon forces the user to reinstall the home-screen
  app (iOS bakes both in at install time). Warn before changing either.
- App docs override this file. Do not restate a rule from here in an app's `CLAUDE.md`.

## Deploy and CI

- Deploy = push to `main`. One Pages workflow assembles `_site/<app>/` for every app; an
  app that fails to build keeps its previous output instead of blocking the others.
- CI is path-filtered — a change under `<app>/**` runs only that app's checks.
- Adding an app: copy `_template/` to `<name>/`, then add it to the app table above and
  to the app lists in the Pages and CI workflows. Nothing else should need to change.
- Browser storage is per-origin, not per-path: all apps share the `jaeyoun98.github.io`
  origin. Namespace localStorage keys and IndexedDB database names per app.

## Proven patterns

Validated in one app, applicable to all. Apply to new apps through `_template/`.

- iOS WebKit gives `input[type=number]` an intrinsic min-width that defeats flex
  shrinking → fix with `width: 0` + `flex-basis: 0` + container `min-width: 0`. (jayfit)
- GitHub Pages serves `Cache-Control: max-age=600`, so a service worker must fetch with
  `cache: 'no-cache'` (ETag revalidation) for a new deploy to land on the next launch.
  iOS applies a fetched update only on the *next* full launch — close the app and
  reopen, sometimes twice right after a deploy. (jayfit, jaybrief)
- Check layout for viewport overflow at 402px (iPhone 16 Pro) and 320px widths.
- `<meta name="apple-mobile-web-app-capable">` is deprecated and logs a console warning;
  ship `<meta name="mobile-web-app-capable" content="yes">` alongside it. (jaybrief has
  both; jayfit still has only the deprecated one.)
