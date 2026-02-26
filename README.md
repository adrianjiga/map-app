# Workout Map

A workout tracker that logs running and cycling sessions on an interactive map. Click anywhere on the map to record a workout — it gets pinned with a marker and listed in the sidebar. Workouts persist across sessions via localStorage.

**Live demo:** [adrianjiga.github.io/map-app](https://adrianjiga.github.io/map-app/)

## Features

- Log running and cycling workouts by clicking on the map
- Markers and sidebar entries for each workout
- Workouts persist across page reloads (localStorage)
- Error banner for validation and geolocation failures (no browser alerts)

## Tech Stack

- Vanilla JS (ES modules, OOP)
- [Leaflet](https://leafletjs.com/) + OpenStreetMap
- Vite, Vitest, ESLint, Prettier

## Getting Started

```bash
npm install
npm run dev
```

Requires browser geolocation permission to initialize the map.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run test suite |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Author

[@adrianjiga](https://github.com/adrianjiga) · [LinkedIn](https://www.linkedin.com/in/adrianjiga/)
