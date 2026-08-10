export const DEFAULT_SORT = 'newest';
export const DEFAULT_FILTER = 'all';

export const SORTERS = {
  newest: (a, b) => b.date - a.date,
  oldest: (a, b) => a.date - b.date,
  distance: (a, b) => b.distance - a.distance,
  duration: (a, b) => b.duration - a.duration,
};

/**
 * Returns the workouts to display, filtered by type and ordered by the chosen
 * sort. Always a new array — the caller's list is the source of truth and must
 * keep its insertion order, since that is what gets persisted.
 */
export function selectWorkouts(
  workouts,
  { sort = DEFAULT_SORT, filter = DEFAULT_FILTER } = {}
) {
  const filtered =
    filter === DEFAULT_FILTER
      ? [...workouts]
      : workouts.filter((workout) => workout.type === filter);

  return filtered.sort(SORTERS[sort] ?? SORTERS[DEFAULT_SORT]);
}
