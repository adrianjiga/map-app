import { WORKOUT_REGISTRY } from '../workouts/index.js';
import { VALIDATORS } from '../validation/validators.js';

export const TRANSFER_VERSION = 1;

export function serializeWorkouts(workouts) {
  return JSON.stringify(
    {
      version: TRANSFER_VERSION,
      exportedAt: new Date().toISOString(),
      workouts,
    },
    null,
    2
  );
}

export function exportFilename(now = new Date()) {
  return `workouts-${now.toISOString().slice(0, 10)}.json`;
}

const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

const hasValidCoords = (coords) =>
  Array.isArray(coords) &&
  coords.length === 2 &&
  coords.every(isFiniteNumber) &&
  Math.abs(coords[0]) <= 90 &&
  Math.abs(coords[1]) <= 180;

/**
 * Turns an exported file back into workout instances.
 *
 * Every entry is rebuilt through the registry rather than trusted as-is:
 * an imported file is untrusted input, and a hand-edited one could otherwise
 * inject arbitrary `description` text or a broken prototype into the store.
 * Derived fields (description, pace, speed) are recomputed, never read.
 *
 * @returns {{ workouts: object[], skipped: number, error?: string }}
 */
export function parseWorkouts(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { workouts: [], skipped: 0, error: 'That file is not valid JSON.' };
  }

  const entries = Array.isArray(payload) ? payload : payload?.workouts;
  if (!Array.isArray(entries)) {
    return {
      workouts: [],
      skipped: 0,
      error: 'That file does not look like a workout export.',
    };
  }

  const workouts = [];
  let skipped = 0;

  entries.forEach((entry) => {
    const workout = reviveEntry(entry);
    if (workout) workouts.push(workout);
    else skipped += 1;
  });

  return { workouts, skipped };
}

function reviveEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const Cls = WORKOUT_REGISTRY[entry.type];
  const validate = VALIDATORS[entry.type];
  if (!Cls || !validate) return null;
  if (!hasValidCoords(entry.coords)) return null;

  const candidate = {
    coords: entry.coords,
    distance: entry.distance,
    duration: entry.duration,
    cadence: entry.cadence,
    elevation: entry.elevation,
  };
  if (!validate(candidate).valid) return null;

  const date = new Date(entry.date);
  if (Number.isNaN(date.getTime())) return null;

  const workout = Cls.fromFormData(candidate);
  workout.date = date;
  workout.id =
    typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : workout.id;
  workout._setDescription();
  return workout;
}
