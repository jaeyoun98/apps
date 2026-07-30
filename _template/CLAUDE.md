# CLAUDE.md — _template

Not an app. A copy source for starting a new one; it is deliberately excluded from the
Pages and CI app lists, so nothing here is deployed or tested.

## Creating an app from this

1. `cp -r _template <name>` (lowercase, no spaces — it becomes the URL path segment).
2. Replace `NewApp` in four places: `<title>` and `apple-mobile-web-app-title` in
   `index.html`, `name`/`short_name` in `manifest.webmanifest`, `APP_NAME` in `app.js`.
3. Change the `CACHE` slug in `sw.js` from `newapp-v1` — two apps sharing a cache name
   would evict each other's entries, since all apps share one origin.
4. Replace `icons/*.png`. They are flat placeholder squares, valid but meaningless.
5. Set `description`, `background_color`, and `theme_color` in the manifest, and
   `theme-color` in `index.html`.
6. Add `<name>` to the app table in the root `CLAUDE.md` and to the app lists in the
   Pages and CI workflows.
7. Delete the demo card in `index.html` — but keep `.custom-row` in `style.css` if any
   number input sits in a flex row; that rule is the iOS fix, not decoration.

## What is already handled

- Light and dark palettes via `prefers-color-scheme` tokens.
- `env(safe-area-inset-*)` padding for notch and home-indicator areas.
- The iOS `input[type=number]` flex-shrink fix (`.custom-row`).
- Service worker: network-first with offline fallback, `cache: 'no-cache'` revalidation,
  and old-cache cleanup on activate. Error responses are never cached.
- Both `mobile-web-app-capable` meta forms.

Rename policy after step 2: changing the display name means editing those same four
places. Renaming the directory also changes the Pages URL, which forces installed PWAs
to be re-added to the home screen.
