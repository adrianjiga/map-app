import { Running } from './Running.js';
import { Cycling } from './Cycling.js';

export { Workout } from './Workout.js';
export { Running } from './Running.js';
export { Cycling } from './Cycling.js';

// Single source of truth for type -> class. Used to construct workouts from
// form data and to restore prototypes when loading from storage, so neither
// App nor WorkoutStorage has to branch on workout.type.
export const WORKOUT_REGISTRY = {
  running: Running,
  cycling: Cycling,
};
