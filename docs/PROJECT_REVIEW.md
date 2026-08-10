# Project Review — Workout Map

Full audit of the codebase as of commit `140bbf3`. Every recommendation below is
zero-cost: no paid services, no hosting changes, no new runtime dependencies
beyond what is already installed.

**Verification performed:** `npm ci`, full test suite (75 tests, 7 files, all
passing), coverage with and without `--coverage.all`, `npm run lint`,
`prettier --check .`, `npm audit`, `npm run build`, and a headless Chromium run
against the real production build (`vite preview`) with geolocation mocked,
capturing desktop and mobile screenshots plus console/network errors.

---

## Scorecard

| #   | Aspect                       | Score    | One-line verdict                                                                  |
| --- | ---------------------------- | -------- | --------------------------------------------------------------------------------- |
| 1   | Architecture & module design | **9/10** | Genuinely well-factored; the standout strength of this project                    |
| 2   | Correctness & robustness     | **6/10** | Clean style, but four real defects — one visible in production                    |
| 3   | Testing                      | **6/10** | 75 solid unit tests, yet the orchestrator has 0% coverage and the config hides it |
| 4   | Accessibility                | **3/10** | Weakest area: unlabelled inputs, no keyboard path to the core interaction         |
| 5   | UX & product completeness    | **4/10** | You can create a workout but never delete or edit one                             |
| 6   | Performance                  | **7/10** | Small bundle, smart geolocation cache; render-blocking fonts and CLS              |
| 7   | Security                     | **7/10** | SHA-pinned actions is above average; missing workflow least-privilege             |
| 8   | Build & tooling              | **7/10** | Vite config is right; ESLint is near-empty and Prettier covers only `src/`        |
| 9   | CI/CD                        | **8/10** | Four workflows, Pages deploy, releases, Dependabot — well built                   |
| 10  | Documentation                | **6/10** | README is clear but thin; `CLAUDE.md` has factual drift                           |
| 11  | Responsive / mobile          | **7/10** | Real mobile layout; wrong keyboard type and no visible submit button              |
| 12  | Repo hygiene                 | **6/10** | No LICENSE, `coverage/` untracked, stale branch references                        |

**Overall: 6.3 / 10** — a well-architected project held back by a production
rendering bug, an accessibility floor, and a missing delete feature.

---

## P0 — Bugs confirmed by execution

### 1. Map markers are broken images in the production build

**Confirmed in a real browser against `dist/`.** The marker `<img>` resolves to
`/map-app/marker-icon.png`, which does not exist in `dist/` — `naturalWidth` is
`0` and the screenshot shows a broken-image placeholder where every pin should
be. This affects the live GitHub Pages site, not just local builds.

Cause: Leaflet's `L.Icon.Default` guesses its image path by reading the
`background-image` of the `.leaflet-default-icon-path` CSS rule. Vite inlines
that PNG as a `data:` URI during the build, so Leaflet's
`.replace(/marker-icon\.png["']?\)$/, '')` heuristic finds nothing to strip and
falls back to an empty path. Dev mode works, which is why it went unnoticed.

Fix — in `src/map/MapService.js`, let the bundler resolve the assets explicitly:

```js
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
```

Add a build-output assertion or a Playwright smoke test so it cannot regress.

### 2. Clicking a stored workout before the map loads throws

`WorkoutRenderer.renderAll()` runs synchronously in the `App` constructor, so
sidebar cards are clickable immediately — but `MapService.#map` only exists once
the geolocation promise resolves. A click in that window calls
`this.#map.setView(...)` on `undefined` and throws. Verified with a unit probe.

Fix: guard `moveToWorkout()` and `renderMarker()` with an
`if (!this.#map) return;` (or queue calls until init resolves), and disable
pointer events on the list until the map is ready.

### 3. Workout IDs collide

`id = (Date.now() + '').slice(-10)` — two workouts created in the same
millisecond get identical IDs, and truncation makes collisions likelier still.
`App.#handleWorkoutClick` uses `find()`, so the wrong marker is targeted.
Verified with fake timers: two `Running` instances produced the same `id`.

Fix: `crypto.randomUUID()` (available in every browser that supports the app's
other features), with `Date.now() + Math.random()` as a fallback.

### 4. `WorkoutStorage.save()` can throw and break submission

`load()` is wrapped in `try/catch` but `save()` is not. In Safari private mode
or at quota, `localStorage.setItem` throws — the exception propagates out of
`#handleFormSubmit`, so the marker and card render but the app is left in a
broken state with no user-facing message.

Fix: wrap `save()` in `try/catch` and surface a persistence failure through
`ErrorBanner`.

---

## P1 — Accessibility (lowest-scoring aspect, all fixes are free)

5. **Labels are not associated with inputs.** Every `<label class="form__label">`
   in `index.html` lacks a `for`, and no input has an `id`. Screen readers
   announce the fields as unlabelled. Add matching `for`/`id` pairs (or wrap).

6. **Workout cards are unreachable by keyboard.** They are `<li>` elements with a
   delegated click handler — no `tabindex`, no `role`, no Enter/Space handling.
   The app's primary interaction is mouse-only. Make each card a `<button>` (or
   add `tabindex="0"` + `role="button"` + a keydown handler) and give it a
   visible `:focus-visible` ring.

7. **The submit button is `display: none`.** `.form__btn` is hidden, so the form
   is submitted only by pressing Enter. There is no discoverable way to save a
   workout — especially on touch devices. Show a styled OK button.

8. **Error banner is not announced.** `ErrorBanner` creates a plain `<div>`. Add
   `role="alert"` and `aria-live="assertive"` so validation and geolocation
   failures reach assistive tech, plus a manual dismiss control.

9. **Invalid HTML: `<form>` is a direct child of `<ul>`.** Only `<li>` is
   permitted there. Wrap the form in an `<li>`, which also fixes the
   `:nth-child` animation-delay offsets in `style.css`.

10. **Mobile sidebar has no focus management.** Opening the overlay does not move
    focus into it or trap it, and there is no Escape-to-close or backdrop click.
    Add all three plus `aria-expanded` on the hamburger button.

11. **Decorative emoji are read aloud.** The 📍 ⏱ ⚡️ 🦶🏼 ⛰ icons in
    `WorkoutRenderer` are announced as words. Add `aria-hidden="true"` to
    `.workout__icon`, and give `.workout__type-badge` a real text label.

12. **No `prefers-reduced-motion` support.** `slideInCard`, `errorSlideDown`, the
    0.5s form transition and the panning map all ignore the user's OS setting.
    Add a media-query block that disables them.

---

## P2 — Missing product features

13. **No delete.** Once created, a workout cannot be removed. This is the single
    most conspicuous gap — add a delete control per card that removes the marker,
    the DOM node, and the array entry, then re-saves.
14. **No edit.** Same for correcting a typo'd distance.
15. **No in-app reset.** `app.reset()` is console-only, and it clears `workouts`
    but leaves the `lastPosition` cache behind. Add a "Clear all" button with a
    confirmation, and clear both keys.
16. **No empty state.** A first-time visitor sees a blank sidebar with no hint
    that they should click the map. Add an instructional placeholder.
17. **No summary stats.** Total distance, total duration and workout count are
    cheap to compute and make the sidebar far more useful.
18. **No "fit to all markers".** A single `map.fitBounds()` button would let users
    see everything they have logged.
19. **No sort or filter.** By date, by type, by distance.
20. **No import/export.** A JSON download/upload of `localStorage` would give
    users a backup path and cost nothing.
21. **No unit toggle.** km/mi is a common ask for a fitness tracker.
22. **Form state can desync after reload.** Browsers restore `<select>` values
    without firing `change`, so the type can read `cycling` while the Cadence row
    is still visible. Set the row visibility explicitly from the current type
    instead of `classList.toggle()` — which is also more robust when a third
    workout type is added.
23. **Unknown workout type silently pushes `undefined`.** `App.#handleFormSubmit`
    has no `else`; a type outside running/cycling corrupts the array. Drive
    construction from a registry (you already have `WORKOUT_REGISTRY`) and throw
    or report on an unknown type.

---

## P3 — Testing

24. **Coverage config hides untested code.** The reported 95.97% is only over
    files a test happens to import. With `coverage.all` and
    `include: ['src/**/*.js']`, the real number is **74.86%** — `App.js` is at
    **0%**. Add the include/exclude config to `vitest.config.js` so the number
    tells the truth.
25. **No tests for `App.js`.** The orchestrator — wiring, submit handling, mobile
    nav, the geolocation failure path — is entirely untested, and that is exactly
    where bug #2 lives.
26. **No coverage thresholds.** Add `thresholds: { lines: 80, branches: 75 }` so
    regressions fail CI instead of being noticed later.
27. **No end-to-end test.** Playwright is free and would have caught the broken
    marker icons. A single smoke test — load the built app, click the map, submit,
    assert the marker image actually loaded (`naturalWidth > 0`) — covers the most
    valuable path.
28. **`CLAUDE.md` claims 8 test files / 74 tests.** There are 7 and 75.

---

## P4 — Build, tooling & repo hygiene

29. **ESLint config is nearly empty.** Four hand-written rules and no
    `@eslint/js` recommended set means `no-undef`, `no-unused-expressions`,
    `no-fallthrough` and friends are all off. Extend `js.configs.recommended`,
    and add a second config block for `src/__tests__/**` with Vitest globals.
30. **Prettier only formats `src/`.** `prettier --check .` currently fails on
    `index.html` and `README.md`. Widen the scripts to `.` and let
    `.prettierignore` do the excluding — then CI enforces the whole repo.
31. **`coverage/` is not in `.gitignore` or `.prettierignore`.** Running
    `npm run test:coverage` leaves ~30 untracked files that pollute
    `git status` and break `format:check`.
32. **No LICENSE file.** The README has no license section either; without one
    the code is "all rights reserved" by default.
33. **`package.json` is missing `description`, `license`, `repository`, and
    `engines`.** Add `"engines": { "node": ">=20" }` to match CI, plus an
    `.nvmrc`.
34. **No `.editorconfig`.** Cheap consistency for contributors not running
    Prettier on save.

---

## P5 — CI/CD & security

35. **Workflows lack least-privilege `permissions`.** `ci.yml` and `build.yml`
    have no `permissions:` block, so they inherit the repo default. Add
    `permissions: { contents: read }` at the top of both. (`deploy.yml` and
    `release.yml` already scope correctly — good.)
36. **No `concurrency` on `ci.yml` / `build.yml`.** Rapid pushes stack redundant
    runs. Add `concurrency: { group: ${{ github.workflow }}-${{ github.ref }},
cancel-in-progress: true }`.
37. **Stale branch filters.** `ci.yml` and `build.yml` still trigger on
    `improvements-feb-2026`, a branch that no longer exists. Also, CI only runs on
    PRs targeting `master`/`improvements-feb-2026` — PRs into other integration
    branches get no checks at all.
38. **No CodeQL scanning.** GitHub's default CodeQL setup is free for public
    repos and catches DOM-XSS patterns of exactly the kind in
    `WorkoutRenderer.render()`.
39. **Two high-severity advisories in dev dependencies.** `npm audit` reports
    `brace-expansion` (DoS) and `nanoid`, both fixable with `npm audit fix`.
    Production deps are clean (`npm audit --omit=dev` → 0). Consider a scheduled
    audit job so this surfaces without a manual run.
40. **`innerHTML` interpolation in `WorkoutRenderer.render()`.** Today the values
    are numbers coerced with `+`, so this is not currently exploitable — but
    `description` and every field flow straight into an HTML template from
    `localStorage`, which means any future non-numeric field (a workout note, a
    custom title) becomes stored XSS. Switch to `textContent` on created nodes,
    or escape at the boundary now while it is a two-line change.
41. **Actions are SHA-pinned with version comments.** Worth calling out as
    already done right — this is better than most repos of this size.

---

## P6 — Performance, styling & polish

42. **Google Fonts is render-blocking with no `preconnect`.** Add
    `<link rel="preconnect" href="https://fonts.googleapis.com">` and
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
    Self-hosting the two families via `@fontsource` would remove the third-party
    round-trip and the privacy exposure entirely — still free.
43. **`<img class="logo">` has no `width`/`height`.** Causes layout shift on load;
    the intrinsic size is known.
44. **The global `a:link` rule leaks into Leaflet.** `a:link, a:visited { color:
var(--color-cycling) }` recolours the zoom controls and the OpenStreetMap
    attribution — visible as orange `+`/`−` buttons in the screenshot. Scope the
    rule to `.sidebar a` or exclude `.leaflet-container a`.
45. **`.workouts { height: 77vh }` is a magic number.** It fights the sidebar's
    own flex column and will misalign whenever the header or footer changes. Use
    `flex: 1; min-height: 0` as the mobile block already does.
46. **`overflow-y: scroll` forces a permanent scrollbar track.** `auto` is the
    intent.
47. **Inputs have no `type="number"` / `inputmode="decimal"`.** Mobile users get
    an alphabetic keyboard for distance, duration, cadence and elevation. Adding
    the right type also gives free browser-level validation and `min="0"`.
48. **Inputs have no `name` attributes**, so the form is not serialisable and
    browser autofill has nothing to key on.
49. **`.form__input:focus` removes the outline.** It substitutes a border colour
    change, which is low-contrast against the dark background. Use
    `:focus-visible` with a real ring.
50. **Only 7 `nth-child` animation delays.** The 8th card onward animates with no
    stagger. Use `animation-delay: calc(var(--i) * 50ms)` or cap it deliberately.
51. **Missing document metadata.** No `<meta name="description">`, no Open Graph
    or Twitter card tags, no `<meta name="theme-color">` to match the dark UI. The
    `X-UA-Compatible` meta is obsolete and can be deleted.
52. **No PWA manifest / service worker.** For a map app whose data lives entirely
    in `localStorage`, offline support is a natural fit — `vite-plugin-pwa` is
    free and the app is already static.
53. **Geolocation cache never expires.** `MapService` reuses `lastPosition`
    indefinitely, so a user who travels sees their old city first. Store a
    timestamp and re-prompt after, say, 24 hours. The background refresh call also
    has no error callback.
54. **`navigator.language` vs `<html lang="en">`.** Dates are formatted in the
    browser locale while the document declares English. Pick one.

---

## Documentation drift to correct

55. `CLAUDE.md` lists `--color-running: #00c46a` and `--color-cycling: #ffb545`;
    the actual tokens in `style.css` are `#00e887` and `#ffaa00`.
56. `CLAUDE.md` does not mention the mobile nav in `App`, the `lastPosition`
    geolocation cache in `MapService`, or the `--shadow-glow-*` tokens.
57. README has no screenshot, no license section, no browser-support note, and no
    architecture overview — the last of which already exists in `CLAUDE.md` and
    could simply be linked.

---

## Suggested order of work

1. **#1** — broken markers in production. Nothing else matters as much; the
   deployed app's core visual is broken.
2. **#2, #3, #4** — the remaining confirmed defects, all small.
3. **#5–#12** — accessibility. The largest quality gain per line changed.
4. **#13, #15, #16** — delete, in-app reset, empty state. Closes the most obvious
   product gaps.
5. **#24–#27** — honest coverage plus a Playwright smoke test, so #1 and #2
   cannot come back.
6. **#29–#31, #35–#37, #39** — tooling and CI hardening.
7. Everything else as polish.
