# PLAN.md — Workout Map App Refactor

## Status Legend
- `[ ]` — Pending
- `[x]` — Completed
- `[~]` — In Progress

---

## Epic 1 — Build Tooling

### Feature 1.1 — Vite Setup `[x]`
- `package.json` with `dev`, `build`, `preview` scripts
- `vite.config.js` (minimal)
- `src/main.js` as Vite entry point
- `index.html` updated: CDN Leaflet removed, `<script type="module" src="/src/main.js">`
- `leaflet` installed as npm dep; imported in `MapService.js` + CSS in `main.js`
- `CLAUDE.md` updated with `npm run dev`

### Feature 1.2 — ESLint + Prettier `[x]`
- `eslint.config.js` (flat config, ESLint v9): `no-unused-vars` error, `no-alert` warn, `eqeqeq` error, `prefer-const` error
- `.prettierrc`: `singleQuote`, `semi`, `trailingComma: es5`, `printWidth: 80`
- `.prettierignore`: `dist/`, `node_modules/`
- `lint`, `format`, `lint:check`, `format:check` scripts added

### Feature 1.3 — Vitest Setup `[x]`
- `vitest.config.js`: `environment: jsdom`, `globals: true`
- `test`, `test:watch`, `test:coverage` scripts
- `vitest`, `@vitest/coverage-v8`, `jsdom` installed
- `src/__tests__/setup.js` (geolocation mock)
- `src/__tests__/workout.test.js` smoke tests

**Tests added: +17 (workout.test.js)**

---

## Epic 2 — Domain Model Hardening

### Feature 2.1 — Workout Registry `[x]`
- `src/workouts/Workout.js`, `Running.js`, `Cycling.js`, `index.js`
- `Running`: `static emoji = '🏃‍♂️'`, `static popupClass = 'running-popup'`, `get emoji()`, `getSpecificFields()`
- `Cycling`: `static emoji = '🚴‍♀️'`, `static popupClass = 'cycling-popup'`, `get emoji()`, `getSpecificFields()`
- `workout.emoji` replaces all `workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'` branches
- `workout.constructor.popupClass` replaces `${workout.type}-popup`

### Feature 2.2 — Intl Dates `[x]`
- `Intl.DateTimeFormat(navigator.language, { month: 'long', day: 'numeric' })` in `Workout._setDescription()`
- Hardcoded `months` array removed entirely

### Feature 2.3 — LocalStorage Hydration `[x]`
- `src/storage/WorkoutStorage.js`: `static save(workouts)` and `static load()`
- `load()` uses `WORKOUT_REGISTRY` map; reconstructs via `Object.create(Cls.prototype)` + `Object.assign` + `new Date(obj.date)`
- Wrapped in try/catch; returns `[]` on failure

**Tests added: +8 (storage.test.js)**

---

## Epic 3 — App Class Decomposition

### Feature 3.1 — MapService Extraction `[x]`
- `src/map/MapService.js`: `init()` returns Promise, `renderMarker()`, `moveToWorkout()`, `renderStoredMarkers()`
- Uses `workout.emoji` and `workout.constructor.popupClass` — zero `workout.type` branching
- Module-level `let map, mapEvent` dead code removed
- Zero `L.` references in `App`

### Feature 3.2 — WorkoutFormController Extraction `[x]`
- `src/form/WorkoutFormController.js`
- `static ANIMATION_DURATION_MS = 1000`
- All 7 module-level DOM refs removed from root scope
- `onSubmit` fires `{ type, distance, duration, cadence, elevation, coords }`

### Feature 3.3 — WorkoutRenderer Extraction `[x]`
- `src/renderer/WorkoutRenderer.js`
- `#buildSpecificFieldsHTML(workout)` iterates `getSpecificFields()` — zero type-switching
- Event delegation via `e.target.closest('.workout')`

**Tests added: +17 (renderer.test.js + formController.test.js + mapService.test.js)**

---

## Epic 4 — Validation & Error UI

### Feature 4.1 — Validator Module `[x]`
- `src/validation/validators.js`: `isFiniteNumber`, `isPositive`, `validateRunning`, `validateCycling`, `VALIDATORS`
- **Bug fix**: cycling `elevation` validated as finite but NOT required positive (downhill is valid)
- `WorkoutFormController` uses `VALIDATORS[type](data)` and fires `onValidationError` — no `alert()`

### Feature 4.2 — Error Banner UI `[x]`
- `src/ui/ErrorBanner.js`: `show(message, { autoDismissMs })`, `hide()`
- `.error-banner` and `.error-banner--hidden` added to `src/style.css`
- Wired to validation errors and geolocation rejection in `App`
- Zero `alert()` calls remain anywhere

**Tests added: +10 (validators.test.js + errorBanner.test.js)**

---

## Epic 5 — CSS Architecture

### Feature 5.1 — Semantic CSS Tokens `[x]`
- `--color-brand--1` → `--color-cycling: #ffb545`
- `--color-brand--2` → `--color-running: #00c46a`
- All 4 usages updated; old names removed

### Feature 5.2 — BEM Audit `[x]`
- `.copyright` → `.sidebar__copyright`
- `.twitter-link` → `.sidebar__link` (all pseudo-class variants updated)

---

## Known Deferred Items
- None

## Breaking Changes
- Requires `npm run dev` (Vite) instead of opening `index.html` directly
- `localStorage` from pre-refactor is re-hydrated correctly via `WorkoutStorage.load()`
- CSS variable names changed (internal only)

## Total Tests: 52+
