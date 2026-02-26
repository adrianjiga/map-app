# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
npm install
npm run dev
```

The app requires browser geolocation permission to initialize the map.

Other scripts:
- `npm test` — run test suite (Vitest + jsdom)
- `npm run lint` — ESLint check
- `npm run format` — Prettier format
- `npm run build` — production build via Vite

## Architecture

This is a modular ES-module app (Vite + vanilla JS). Entry point is `src/main.js`.

### Module Structure

```
src/
  main.js                    — Vite entry: imports CSS, instantiates App
  App.js                     — Orchestrator only; no DOM queries or L. calls
  workouts/
    Workout.js               — Base class: date, id, _setDescription() with Intl
    Running.js               — calcPace(), getSpecificFields(), static emoji/popupClass
    Cycling.js               — calcSpeed(), getSpecificFields(), static emoji/popupClass
    index.js                 — re-exports all workout classes
  map/
    MapService.js            — Wraps Leaflet: init() Promise, renderMarker(), moveToWorkout()
  form/
    WorkoutFormController.js — Form show/hide/validate; fires onSubmit({type,...,coords})
  renderer/
    WorkoutRenderer.js       — Sidebar HTML via getSpecificFields(); event delegation
  storage/
    WorkoutStorage.js        — save()/load() with prototype-restoring hydration
  validation/
    validators.js            — validateRunning, validateCycling, VALIDATORS map
  ui/
    ErrorBanner.js           — show(message)/hide() with auto-dismiss; no alert()
  style.css
  __tests__/                 — 8 test files + setup.js
```

### App Initialization Flow

1. `new App()` → renders stored workouts from `WorkoutStorage.load()` into sidebar
2. `MapService.init()` → Promise wrapping geolocation → Leaflet map initializes
3. Map resolves → `renderStoredMarkers()` adds markers for loaded workouts
4. Map click → `WorkoutFormController.show(mapEvent)` → user submits
5. `WorkoutFormController` validates via `VALIDATORS[type]` → fires `onSubmit` or `onValidationError`
6. `App.#handleFormSubmit` → creates `Running` or `Cycling` → `MapService.renderMarker()` + `WorkoutRenderer.render()` + `WorkoutStorage.save()`

### Key Design Decisions

- **Prototype restoration**: `WorkoutStorage.load()` uses `Object.create(Cls.prototype)` + `Object.assign` to restore full class instances from JSON — `getSpecificFields()` works on reloaded workouts.
- **Static type metadata**: `Running.emoji`, `Running.popupClass` live on the constructor — renderer and map code never branch on `workout.type`.
- **`WorkoutFormController.ANIMATION_DURATION_MS = 1000`**: replaces the magic `setTimeout(1000)` number.
- **Event delegation**: `WorkoutRenderer` listens on `.workouts` container via `e.target.closest('.workout')`, passes `data-id` to `App`.
- **No `alert()`**: all errors go through `ErrorBanner.show()` with 4s auto-dismiss.
- **`app.reset()`**: exposed on `window.app`; call from browser console to wipe localStorage and reload.

### CSS Tokens

- `--color-running: #00c46a` (green) — running sidebar border + popup border
- `--color-cycling: #ffb545` (orange) — cycling sidebar border + popup border
- `--color-brand--1` and `--color-brand--2` are **removed**; use the semantic names above.
- `font-size: 62.5%` on `html` sets 1rem = 10px throughout.

### External Dependencies

- **Leaflet 1.9.3** (npm) — Map rendering and marker/popup management
- **OpenStreetMap** — Tile layer (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Manrope** font via Google Fonts CDN

### Adding a New Workout Type

1. Create `src/workouts/Swimming.js` extending `Workout` — add `static emoji`, `static popupClass`, `getSpecificFields()`
2. Add `validateSwimming` in `src/validation/validators.js` and register in `VALIDATORS`
3. Add to `WORKOUT_REGISTRY` in `src/storage/WorkoutStorage.js`
4. Add `<option value="swimming">` in `index.html`
5. Add CSS color token and `.workout--swimming` rule in `src/style.css`

Zero changes needed to `WorkoutRenderer`, `MapService`, `ErrorBanner`, or `App`.
