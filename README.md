# Workout Map

[![CI](https://github.com/adrianjiga/map-app/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianjiga/map-app/actions/workflows/ci.yml)
[![CodeQL](https://github.com/adrianjiga/map-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/adrianjiga/map-app/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A workout tracker that logs running and cycling sessions on an interactive map.
Click anywhere on the map to record a workout — it gets pinned with a marker and
listed in the sidebar. Everything is stored in your browser; there is no backend
and no account.

**Live demo:** [adrianjiga.github.io/map-app](https://adrianjiga.github.io/map-app/)

## Features

- Log running and cycling workouts by clicking on the map
- Each workout gets a map marker and a sidebar card
- Edit a workout in place, including changing its type
- Delete individual workouts, or clear all with a confirmation step
- Running summary: workout count, total distance, total duration
- Fit the map to every marker at once
- Workouts persist across reloads via `localStorage`
- Inline error banner for validation and geolocation failures — no browser alerts
- Fully keyboard operable, with a screen-reader-friendly sidebar and form
- Honours `prefers-reduced-motion`

## Tech Stack

- Vanilla JS (ES modules, OOP) — no framework
- [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles
- Vite (build), Vitest + jsdom (unit), Playwright + axe-core (end-to-end)
- ESLint, Prettier
- Self-hosted fonts via `@fontsource-variable` — no third-party requests before
  first paint

## Getting Started

```bash
npm install
npm run dev
```

The app requires browser geolocation permission to initialise the map.

## Scripts

| Script                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start the dev server                          |
| `npm run build`         | Production build                              |
| `npm run preview`       | Serve the production build locally            |
| `npm test`              | Unit tests (Vitest + jsdom)                   |
| `npm run test:coverage` | Unit tests with coverage thresholds enforced  |
| `npm run test:e2e`      | End-to-end tests against the production build |
| `npm run lint`          | ESLint                                        |
| `npm run format`        | Prettier (writes)                             |

`lint:check` and `format:check` are the non-writing variants CI runs.

## Architecture

Each concern lives in its own module and communicates through constructor
callbacks; `App` wires them together and owns no rendering of its own. Leaflet
is confined entirely to `MapService`, so no other module knows it exists.

```
src/
  App.js          Orchestrator
  workouts/       Workout base class, Running, Cycling, WORKOUT_REGISTRY
  map/            MapService — the only module that touches Leaflet
  form/           WorkoutFormController
  renderer/       WorkoutRenderer — builds cards as DOM nodes
  storage/        WorkoutStorage — localStorage with prototype restoration
  validation/     Per-type validators
  ui/             ErrorBanner, WorkoutSummary
```

Adding a new workout type touches five source files and requires no changes to
the renderer, the map, or `App`. See [CLAUDE.md](./CLAUDE.md) for the full module
map, the initialisation flow, and the design decisions behind each of these —
including the accessibility and contrast invariants the test suite enforces.

## Testing

```bash
npm run test:coverage   # unit tests, coverage thresholds enforced
npm run test:e2e        # end-to-end tests, including axe accessibility scans
```

The end-to-end suite runs against the **production build** rather than the dev
server, because some defects only appear after bundling. It asserts that map
marker images actually decode, that a workout can be added and selected using
only the keyboard, and that no page state produces a serious or critical axe
violation.

## Data & Privacy

There is no backend. Two `localStorage` keys are used, both same-origin and
never transmitted:

- `workouts` — your logged workouts, including their map coordinates
- `lastPosition` — your last known position, rounded to roughly 1 km and
  discarded after 24 hours, used only to render the initial map view without
  waiting on the geolocation prompt

Map tiles are requested from OpenStreetMap, which sees your approximate viewport
like any map site. To wipe everything, use **Clear all** in the sidebar, or run
`app.reset()` in the browser console to also clear the cached position.

## Browser Support

Modern evergreen browsers (Chrome, Firefox, Safari, Edge). The app relies on ES
modules, private class fields, `crypto.randomUUID()` and the `inert` attribute,
so it does not support Internet Explorer or pre-2023 browser versions.

## License

[MIT](./LICENSE)

## Author

[@adrianjiga](https://github.com/adrianjiga) · [LinkedIn](https://www.linkedin.com/in/adrianjiga/)
