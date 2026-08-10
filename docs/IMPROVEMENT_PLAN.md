# Improvement Plan — Getting to 8/10 Across the Board

Companion to [`PROJECT_REVIEW.md`](./PROJECT_REVIEW.md). That document says what
is wrong; this one says what to do about it, in what order, and what it costs.

**Target:** every aspect at 8/10 or better. Nothing here requires paid services,
paid hosting, or a paid tool. Two optional items add free npm dev dependencies;
both have zero-dependency alternatives noted inline.

**Total effort: roughly 22–31 focused hours**, split across six pull requests
that can land independently and in order.

---

## Gap analysis

| Aspect                       | Now | Target | What closes the gap                                                     | PR  |
| ---------------------------- | --- | ------ | ----------------------------------------------------------------------- | --- |
| Architecture & module design | 9   | 9      | Nothing — protect it while adding the marker registry                   | 4   |
| Correctness & robustness     | 6   | 8      | The four confirmed defects + unknown-type guard + form desync           | 1   |
| Testing                      | 6   | 8      | Honest coverage config, thresholds, `App.js` tests, Playwright smoke    | 1   |
| Accessibility                | 3   | 8      | Labels, keyboard cards, visible submit, live region, focus management   | 3   |
| UX & product completeness    | 4   | 8      | Delete, empty state, in-app reset, summary stats, fit-to-markers        | 4   |
| Performance                  | 7   | 8      | Font loading, image dimensions, layout cleanup, geolocation cache TTL   | 5   |
| Security                     | 7   | 8      | Workflow least-privilege, CodeQL, `audit fix`, escape the HTML template | 2,3 |
| Build & tooling              | 7   | 8      | ESLint recommended set + test globals, Prettier repo-wide               | 2   |
| CI/CD                        | 8   | 9      | Concurrency, stale branch filters, coverage gate                        | 2   |
| Documentation                | 6   | 8      | Fix `CLAUDE.md` drift, expand README, document new features             | 6   |
| Responsive / mobile          | 7   | 8      | Input types, visible submit, Escape/backdrop close, popup bounds        | 3   |
| Repo hygiene                 | 6   | 8      | LICENSE, `.editorconfig`, `.nvmrc`, `engines`, package metadata         | 2   |

Architecture is already above target. The only change that could threaten it is
the marker registry in PR 4 — the plan keeps all Leaflet state inside
`MapService` specifically to preserve the current separation.

---

## PR 1 — Production defects and a regression net

**Effort: 4–6 hours. Raises Correctness 6→8 and Testing 6→8.**

This is the only urgent PR. The deployed site currently renders broken images
where every map pin should be.

### 1.1 Fix the Leaflet marker icons

In `src/map/MapService.js`, replace Leaflet's path-guessing with explicit
bundler-resolved imports:

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

### 1.2 Guard the map before it exists

Add an `#isReady` check to `MapService.moveToWorkout()` and `renderMarker()`.
Prefer queueing over silent return, so a click during the geolocation window
still does the right thing once the map resolves:

```js
#pending = [];

#whenReady(fn) {
  if (this.#map) return fn();
  this.#pending.push(fn);
}
```

Flush `#pending` at the end of `#initMap()`. Also add a `.workouts--loading`
class that suppresses pointer events on cards until init settles, so the UI
matches the behaviour.

### 1.3 Replace the ID scheme

In `src/workouts/Workout.js`:

```js
id =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
```

No migration needed — existing stored IDs stay valid strings and continue to
match. Only newly created workouts get the new format.

### 1.4 Make persistence failures visible

Wrap `WorkoutStorage.save()` in `try/catch`, return a boolean, and have
`App.#handleFormSubmit` route a `false` through `ErrorBanner.show()` with
something like "Workout saved to the map but could not be stored — it will be
lost on reload."

### 1.5 Guard the unknown workout type

Replace the `if/else if` chain in `App.#handleFormSubmit` with construction from
a registry, reusing the one that already exists in `WorkoutStorage`. Extract
`WORKOUT_REGISTRY` into `src/workouts/index.js` so both modules share it — this
also removes the last place in `App` that branches on workout type, and cuts a
step from the "Adding a New Workout Type" checklist in `CLAUDE.md`.

### 1.6 Tell the truth about coverage

In `vitest.config.js`:

```js
coverage: {
  all: true,
  include: ['src/**/*.js'],
  exclude: ['src/__tests__/**', 'src/main.js'],
  thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
}
```

The number will drop from 95.97% to ~75% on the first run. That is the point.

### 1.7 Test `App.js`

New `src/__tests__/app.test.js` with fakes for the four collaborators: form
submit creates the right subclass and persists; workout click resolves the ID
and moves the map; geolocation rejection shows the banner; mobile nav toggles
the sidebar class. Target ~85% on `App.js`, which is what carries the suite over
the new thresholds.

### 1.8 Add a Playwright smoke test

`npm i -D @playwright/test`. One spec against the **production build**, because
that is where bug 1.1 lives and where a dev-server test would have missed it:

```
npm run build && npm run preview
→ load with mocked geolocation
→ click the map, fill the form, submit
→ assert a .workout card exists
→ assert the marker icon actually loaded (naturalWidth > 0)
→ reload and assert the workout persists
```

Wire it as `npm run test:e2e` and add a job to `ci.yml`. Chromium is the only
browser needed; `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` and the runner's bundled
Chromium keep CI time low.

---

## PR 2 — Tooling, CI and repo hygiene

**Effort: 2–3 hours. Raises Build 7→8, Repo 6→8, CI 8→9, and part of Security.**

Cheap, mechanical, and it makes every later PR enforceable. Land it early.

### 2.1 A real ESLint config

```js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {/* existing browser globals + custom rules */},
  {
    files: ['src/__tests__/**/*.js'],
    languageOptions: { globals: { ...globals.vitest } },
  },
];
```

Today `no-undef`, `no-fallthrough` and `no-unused-expressions` are all off. Fix
whatever `recommended` surfaces — expect a handful of items at most.

### 2.2 Prettier over the whole repo

Change `format` to `prettier --write .` and `format:check` to
`prettier --check .`, then add `coverage/`, `dist/`, `node_modules/`,
`package-lock.json` to `.prettierignore`. Run `--write` once to absorb
`index.html` and `README.md`, which currently fail the check.

### 2.3 `.gitignore`

Add `coverage/`, `playwright-report/`, `test-results/`, `.DS_Store`.

### 2.4 Project metadata

- `LICENSE` — MIT is the conventional choice for a portfolio project; add a
  matching README section.
- `package.json` — `description`, `license`, `repository`, `homepage`,
  `"engines": { "node": ">=20" }`.
- `.nvmrc` containing `20`, matching CI.
- `.editorconfig` mirroring the Prettier settings.

### 2.5 Workflow hardening

- Add `permissions: { contents: read }` to `ci.yml` and `build.yml`.
  (`deploy.yml` and `release.yml` are already correctly scoped.)
- Add `concurrency` with `cancel-in-progress: true` to `ci.yml` and `build.yml`.
- Drop the `improvements-feb-2026` branch filters; that branch is gone. Change
  the `pull_request` triggers to run on all PRs regardless of target branch, so
  work into integration branches is still checked.
- Add the coverage and E2E steps from PR 1 as CI jobs.

### 2.6 Security scanning

- Enable GitHub's default CodeQL setup (free on public repositories) — one
  toggle in Settings → Code security, or commit `.github/workflows/codeql.yml`.
- Run `npm audit fix` for the two high-severity dev-dependency advisories
  (`brace-expansion`, `nanoid`). Production dependencies are already clean.

---

## PR 3 — Accessibility

**Effort: 5–7 hours. Raises Accessibility 3→8, Responsive 7→8, and the rest of
Security 7→8.**

The largest score movement in the plan, and mostly markup work. It touches
`index.html`, `WorkoutRenderer`, `ErrorBanner`, `App` and `style.css`, and will
require updating the existing renderer and form-controller tests — budget time
for that.

### 3.1 Form markup

- Wrap the form in an `<li>` so the `<ul>` contains only valid children. This
  shifts the `:nth-child` animation delays by one — update `style.css` to match.
- Give every input an `id` and each label a matching `for`.
- Add `name` attributes so the form is serialisable and autofill-capable.
- Add `type="number"`, `inputmode="decimal"`, `min="0"`, and `step="any"` to
  distance, duration and cadence; elevation gets `type="number"` with no `min`,
  since descent is legitimately negative. This fixes the mobile keyboard problem
  at the same time.
- Make `.form__btn` visible and styled. This is the single highest-impact fix in
  the PR — right now there is no discoverable way to save a workout.

### 3.2 Keyboard-operable workout cards

Change the card template in `WorkoutRenderer` so each entry contains a
`<button class="workout__select">` wrapping the header and metrics, or make the
`<li>` contents a button. Keep the existing event delegation — `closest('.workout')`
still works. Add a `:focus-visible` outline in `style.css` that is clearly
visible against `--bg-card`.

### 3.3 Announce errors

In `ErrorBanner`, set `role="alert"` and `aria-live="assertive"` on the created
element, and add a dismiss button with `aria-label="Dismiss"` so the message is
not only removable by waiting 4 seconds.

### 3.4 Mobile overlay focus management

In `App.#openSidebar()` / `#closeSidebar()`: move focus into the sidebar on
open, restore it to the hamburger on close, trap Tab inside while open, close on
Escape, and toggle `aria-expanded` plus `inert`/`aria-hidden` on the background.

### 3.5 Screen-reader noise and motion

- `aria-hidden="true"` on `.workout__icon` and `.workout__type-badge`; add a
  visually-hidden text label for the workout type instead.
- Add a `@media (prefers-reduced-motion: reduce)` block that disables
  `slideInCard`, `errorSlideDown`, the form transition, and passes
  `animate: false` to `map.setView()`.

### 3.6 Escape the HTML template

While `WorkoutRenderer.render()` is already being edited: build the card with
`document.createElement` + `textContent`, or add an `escapeHtml()` helper at the
interpolation boundary. Not currently exploitable — every value is a coerced
number — but it is the difference between "safe by accident" and "safe by
construction", and it closes the door before anyone adds a free-text note field.

### 3.7 Verify with a tool, not by eye

Add `@axe-core/playwright` (free) to the E2E suite and assert zero serious or
critical violations on load, with the form open, and with a workout rendered.
That is what makes the 8 defensible rather than self-assessed.

---

## PR 4 — Product completeness

**Effort: 6–8 hours. Raises UX 4→8.**

### 4.1 Marker registry in `MapService`

The enabling change: `#markers = new Map()` keyed by workout ID, populated in
`renderMarker()`, with a new `removeMarker(id)` and a `fitToWorkouts()` using
`L.featureGroup(...).getBounds()`. `moveToWorkout()` can then also open the
right popup. All Leaflet state stays inside `MapService` — no other module
learns that Leaflet exists, which is what keeps the architecture score at 9.

### 4.2 Delete a workout

A delete button per card (`aria-label="Delete <description>"`), handled through
the renderer's existing delegation with an `onWorkoutDelete` callback alongside
`onWorkoutClick`. `App` removes from the array, calls `removeMarker(id)` and
`renderer.remove(id)`, then re-saves. This is the most conspicuous gap in the
product — the review's item 13.

### 4.3 Empty state

When `#workouts` is empty, render a placeholder telling the user to click the
map. Currently a first-time visitor sees an empty dark panel with no hint. Show
and hide it from `App` as the list changes.

### 4.4 Clear all, in the UI

A "Clear all" control with a confirmation step that removes every workout and
marker, and clears **both** `workouts` and `lastPosition` — `app.reset()`
currently leaves the cached position behind. Keep `window.app` for debugging.

### 4.5 Summary stats

A header strip above the list: workout count, total distance, total duration.
Pure derivation from the existing array, recomputed on every mutation, and it
makes the sidebar meaningfully more useful.

### 4.6 Fit to all markers

One button calling `fitToWorkouts()` from 4.1.

**Deliberately out of scope**, because 8/10 does not require them: editing a
workout, sort/filter, JSON import/export, km/mi toggle, PWA offline support.
Those are the path from 8 to 9 — see the closing section.

---

## PR 5 — Performance and visual polish

**Effort: 3–4 hours. Raises Performance 7→8.**

- **Fonts.** Minimum: add `preconnect` for `fonts.googleapis.com` and
  `fonts.gstatic.com` (crossorigin). Better: self-host both families with
  `@fontsource/oxanium` and `@fontsource-variable/plus-jakarta-sans` — free, and
  it removes the render-blocking third-party round trip and the privacy exposure
  entirely. Measure with Lighthouse before and after.
- **Logo dimensions.** Add `width`/`height` to eliminate the layout shift.
- **Scope the link colour.** `a:link, a:visited { color: var(--color-cycling) }`
  currently recolours Leaflet's zoom controls and the OpenStreetMap attribution.
  Scope it to `.sidebar a`.
- **Drop the magic height.** Replace `.workouts { height: 77vh }` with
  `flex: 1; min-height: 0` — the mobile block already does this correctly — and
  change `overflow-y: scroll` to `auto`.
- **Stagger without hardcoding.** Replace the seven `:nth-child` delay rules with
  a `--i` custom property set per card, or cap the stagger deliberately.
- **Document metadata.** Add `<meta name="description">`, Open Graph and Twitter
  card tags, and `<meta name="theme-color" content="#0b0d11">`. Delete the
  obsolete `X-UA-Compatible` meta.
- **Expire the geolocation cache.** Store `{ coords, timestamp }` and re-prompt
  after 24 hours; add the missing error callback to the background refresh.
- **Pick one locale source.** `navigator.language` formats the dates while the
  document declares `lang="en"`.

---

## PR 6 — Documentation

**Effort: 2–3 hours. Raises Documentation 6→8.**

- Correct the `CLAUDE.md` drift: the colour tokens are `#00e887` / `#ffaa00`, not
  `#00c46a` / `#ffb545`; there are 7 test files, not 8.
- Document what PRs 1–5 added: the marker registry, the shared workout registry,
  the delete/stats/clear-all flows, the E2E suite, the geolocation cache TTL.
- Update the "Adding a New Workout Type" checklist — PR 1.5 removes a step.
- README: add a screenshot, a license section, a short architecture overview
  linking to `CLAUDE.md`, a browser-support note, and the new scripts
  (`test:e2e`, `test:coverage`).
- Add a CI badge and, once CodeQL is on, a security badge.

---

## Sequencing and risk

```
PR 1 ──► PR 2 ──► PR 3 ──► PR 4 ──► PR 5 ──► PR 6
 │        │        │        │
 │        │        │        └─ depends on PR 1.3 (stable IDs) for delete
 │        │        └─ rewrites the card template; PR 4 builds on that markup
 │        └─ enforces everything that follows
 └─ urgent: the live site is visibly broken
```

**PR 1 should ship today or tomorrow** regardless of what happens to the rest of
this plan. Everything after it is quality work that can proceed at any pace.

Two risks worth naming:

- **PR 3 and PR 4 both rewrite the card template.** They are sequenced so PR 3
  establishes the accessible structure and PR 4 adds the delete control into it.
  Doing them in parallel means resolving the same conflict twice.
- **Existing tests will break in PR 3.** `renderer.test.js` and
  `formController.test.js` assert against the current markup. That is expected
  and healthy — but it is real work, not a rounding error, and it is why PR 3 is
  budgeted at 5–7 hours rather than 3.

---

## After 8: what a 9 would take

Not part of this plan, listed so the ceiling is visible. Editing a workout;
sort and filter; JSON import/export as a backup path; a km/mi toggle; PWA
offline support via `vite-plugin-pwa`; drawing an actual route rather than a
single point; visual regression tests; and a Lighthouse CI budget enforced on
every PR. All free, all additive, none of them prerequisites for calling this a
solid, professional project.
