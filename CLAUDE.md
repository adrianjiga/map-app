# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
npm install
npm run dev
```

The app requires browser geolocation permission to initialize the map.

Other scripts:

| Script                  | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `npm test`              | Run unit test suite (Vitest + jsdom)                |
| `npm run test:coverage` | Unit tests with coverage thresholds                 |
| `npm run test:e2e`      | Playwright smoke tests against the production build |
| `npm run lint`          | ESLint check                                        |
| `npm run format`        | Prettier format                                     |
| `npm run build`         | Production build via Vite                           |

## Architecture

Modular ES-module app (Vite + vanilla JS). Entry point is `src/main.js`.

### Module Structure

```
src/
  main.js                     Vite entry: imports fonts + CSS, instantiates App
  App.js                      Orchestrator; owns sidebar chrome wiring, never calls L.
  workouts/
    Workout.js                Base class: date, id, _setDescription() with Intl
    Running.js                calcPace(), getSpecificFields(), static emoji/popupClass
    Cycling.js                calcSpeed(), getSpecificFields(), static emoji/popupClass
    index.js                  Re-exports classes + WORKOUT_REGISTRY (type -> class)
  map/
    MapService.js             Wraps Leaflet: init() Promise, renderMarker(), moveToWorkout()
                              Marker registry by workout id: removeMarker(), fitToWorkouts()
                              Queues calls made before the map exists; pins icon URLs
  form/
    WorkoutFormController.js  Form show/hide/validate; fires onSubmit({type,...,coords})
  renderer/
    WorkoutRenderer.js        Builds cards as DOM nodes (never innerHTML); event delegation
  storage/
    WorkoutStorage.js         save() -> boolean; load() with prototype-restoring hydration
  validation/
    validators.js             validateRunning, validateCycling, VALIDATORS map
  ui/
    ErrorBanner.js            role=alert live region + dismiss button; no alert()
    WorkoutSummary.js         Count / total distance / total duration strip
  style.css
  __tests__/                  One unit suite per module + setup.js
e2e/
  smoke.spec.js               Core flows against the production build
  a11y.spec.js                axe scans + keyboard and focus behaviour
  workouts.spec.js            Delete, summary, clear-all, fit-to-markers
                              (run with `npm run test:e2e`)
```

### Initialization Flow

1. `new App()` → renders stored workouts from `WorkoutStorage.load()` into the sidebar, then `#refreshSidebar()` updates the summary and control visibility
2. The list is marked `.workouts--loading` — cards exist but cannot pan a map that does not exist yet
3. `MapService.init()` → Promise wrapping geolocation → Leaflet map initializes (from a cached position when one is fresh, otherwise from a prompt)
4. Map resolves → loading class cleared → `renderStoredMarkers()` places markers; anything queued during the wait replays
5. Map click → `WorkoutFormController.show(mapEvent)`
6. Form submit → `VALIDATORS[type]` → fires `onSubmit` or `onValidationError`
7. `App.#handleFormSubmit` → `WORKOUT_REGISTRY[type].fromFormData()` → `renderMarker()` + `render()` + `#refreshSidebar()` + `#persist()`

### Key Design Decisions

- **Prototype restoration** — `WorkoutStorage.load()` uses `Object.create(Cls.prototype)` + `Object.assign` to restore full class instances from JSON; `getSpecificFields()` works on reloaded workouts.
- **Static type metadata** — `Running.emoji`, `Running.popupClass` on the constructor; renderer and map code never branch on `workout.type`.
- **Single workout registry** — `WORKOUT_REGISTRY` in `src/workouts/index.js` maps type to class. `App` constructs via `Cls.fromFormData(data)` and `WorkoutStorage` restores prototypes from the same map, so neither branches on type.
- **Leaflet icon URLs are pinned** — `MapService` calls `L.Icon.Default.mergeOptions()` with bundler-resolved imports. Leaflet's own path-guessing reads a CSS `background-image` that Vite inlines as a data URI, which 404s the markers in a production build.
- **Map calls are queued before init** — the sidebar renders stored workouts before geolocation resolves, so `renderMarker()`/`moveToWorkout()` buffer until `#initMap()` runs. `.workouts--loading` keeps the cards inert meanwhile.
- **`WorkoutStorage.save()` returns a boolean** — `false` means the write was rejected (quota, private mode); `App` surfaces that through `ErrorBanner`.
- **No `alert()`** — all errors go through `ErrorBanner.show()` with 4s auto-dismiss.
- **`app.reset()`** — exposed on `window.app`; call from the browser console to wipe both localStorage keys (`workouts`, `lastPosition`) and reload. The in-app "Clear all" button only clears workouts.
- **Marker registry** — `MapService` keeps `id -> L.Marker` so markers can be removed individually or fitted in bulk. All Leaflet state stays inside `MapService`; no other module knows Leaflet exists.
- **Destructive actions are two-step, not `confirm()`** — "Clear all" arms for `App.CLEAR_CONFIRM_MS` and clears on a second click. Native dialogs are banned by `no-alert`, and a real modal would need its own focus management.
- **`[hidden] { display: none !important }`** — any class setting `display` outranks the UA's `[hidden]` rule, so elements toggled via the attribute would otherwise stay visible.
- **`WorkoutFormController.ANIMATION_DURATION_MS = 1000`** — named constant for the form hide `setTimeout`.

### Accessibility Invariants

Guarded by `e2e/a11y.spec.js`, which fails on any serious or critical axe violation.

- **Cards are real `<button>`s** — `.workout__select` wraps the card contents, so keyboard operability, focus and Enter/Space come from the platform. A button only allows phrasing content, so the card uses `<span>`s with CSS `display` rather than `<div>`/`<h2>`.
- **Cards are built as DOM nodes** — `WorkoutRenderer` uses `createElement` + `textContent`. Values come from `localStorage`, so string-interpolated HTML would make any future free-text field a stored-XSS vector.
- **Every form control has a `for`/`id` pair and a `name`**, and numeric fields use `type="number"` + `inputmode="decimal"`. No `min` — `VALIDATORS` owns all validation so error messaging stays in `ErrorBanner` rather than splitting between it and native tooltips.
- **Decorative emoji carry `aria-hidden="true"`** — `.workout__icon` and `.workout__type-badge`.
- **The mobile sidebar is a modal overlay** — opening traps Tab, sets `aria-expanded`, marks `#map` `inert`, and moves focus to the close button; closing restores focus to the hamburger. Escape closes.
- **`--accent-ui-strong`** exists because white on `--accent-ui` is only 4.46:1. Use it for any solid button with white text.
- **`--color-error-strong`** for white text on a red fill; **`--color-error-text`** for red text on a dark surface. Plain `--color-error` fails AA in both roles.
- **`--text-secondary` is `#7c8aa0`**, not the original `#64748b`, which was 3.76:1 on `--bg-card`.
- **Reduced motion** — a `prefers-reduced-motion` block neutralises animations, and `MapService.prefersReducedMotion()` drops the pan animation.

### Performance & Asset Decisions

- **Fonts are self-hosted** via `@fontsource-variable/*`, imported in `src/main.js`. The Google Fonts stylesheet was a render-blocking third-party request. Family names are `'Oxanium Variable'` and `'Plus Jakarta Sans Variable'` — the non-variable names do not resolve.
- **`--card-index`** is set per card by `WorkoutRenderer` and consumed by the `animation-delay` in `.workout`, so the stagger continues past the eighth card. Capped at 400ms.
- **Cached geolocation expires** after `MapService.CACHE_TTL_MS` (24h) and is stored coarsened to `MapService.CACHE_PRECISION` decimals (~1.1km) — it only seeds the initial zoom-13 view, so a precise home address never reaches localStorage. Workout coordinates keep full precision because their markers need it. Legacy `[lat, lng]` entries written before the timestamp existed are still accepted once, then rewritten in `{ coords, savedAt }` shape.
- **Dates follow `document.documentElement.lang`** via `Workout.locale()`, not `navigator.language` — the UI copy is English-only, so localising just the dates contradicted the declaration.
- **`.logo` sets `width: auto`** alongside the intrinsic `width`/`height` attributes; without it the attribute width wins and the image stretches.

### CSS Tokens

Sport accents:

- `--color-running: #00e887` — running sidebar border + popup
- `--color-cycling: #ffaa00` — cycling sidebar border + popup

Contrast-sensitive tokens have paired variants; see Accessibility Invariants
above before introducing a new colour:

- `--accent-ui` / `--accent-ui-strong` — focus rings and borders / solid buttons with white text
- `--color-error` / `--color-error-strong` / `--color-error-text` — accents / white-on-red fills / red text on dark surfaces
- `--text-primary` / `--text-secondary` / `--text-muted`

### Adding a New Workout Type

1. `src/workouts/Swimming.js` — extend `Workout`, add `static emoji`, `static popupClass`, `getSpecificFields()`
2. Add `validateSwimming` in `src/validation/validators.js`, register in `VALIDATORS`
3. Add a `static fromFormData({ coords, distance, duration, ... })` factory, and register the class in `WORKOUT_REGISTRY` in `src/workouts/index.js`
4. Add `<option value="swimming">` in `index.html`
5. Add CSS token + `.workout--swimming` rule in `src/style.css`
6. Add a case to `src/__tests__/workout.test.js` and, if the sport has a distinct
   field, to `src/__tests__/validators.test.js`

Zero changes needed to `WorkoutRenderer`, `MapService`, `WorkoutSummary`,
`ErrorBanner`, or `App` — they read `getSpecificFields()`, the static type
metadata, and `distance`/`duration`, none of which are type-specific.
