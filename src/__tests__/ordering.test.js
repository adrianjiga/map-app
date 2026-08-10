import { describe, it, expect } from 'vitest';
import {
  selectWorkouts,
  SORTERS,
  DEFAULT_SORT,
  DEFAULT_FILTER,
} from '../workouts/ordering.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

function build({ type = 'running', distance = 5, duration = 30, day = 1 }) {
  const workout =
    type === 'running'
      ? new Running([0, 0], distance, duration, 160)
      : new Cycling([0, 0], distance, duration, 100);
  workout.date = new Date(2026, 0, day);
  return workout;
}

describe('selectWorkouts', () => {
  const short = build({ distance: 2, duration: 10, day: 3 });
  const long = build({ distance: 20, duration: 90, day: 1 });
  const ride = build({ type: 'cycling', distance: 10, duration: 40, day: 2 });
  const all = [short, long, ride];

  it('defaults to newest first', () => {
    expect(selectWorkouts(all).map((w) => w.date.getDate())).toEqual([3, 2, 1]);
  });

  it('sorts oldest first', () => {
    expect(
      selectWorkouts(all, { sort: 'oldest' }).map((w) => w.date.getDate())
    ).toEqual([1, 2, 3]);
  });

  it('sorts by longest distance', () => {
    expect(
      selectWorkouts(all, { sort: 'distance' }).map((w) => w.distance)
    ).toEqual([20, 10, 2]);
  });

  it('sorts by longest duration', () => {
    expect(
      selectWorkouts(all, { sort: 'duration' }).map((w) => w.duration)
    ).toEqual([90, 40, 10]);
  });

  it('filters to a single type', () => {
    const result = selectWorkouts(all, { filter: 'cycling' });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(ride);
  });

  it('combines filter and sort', () => {
    const result = selectWorkouts(all, {
      filter: 'running',
      sort: 'distance',
    });
    expect(result.map((w) => w.distance)).toEqual([20, 2]);
  });

  it('returns everything for the default filter', () => {
    expect(selectWorkouts(all, { filter: DEFAULT_FILTER })).toHaveLength(3);
  });

  it('never mutates the source array', () => {
    const source = [short, long, ride];
    const snapshot = [...source];
    selectWorkouts(source, { sort: 'distance' });
    expect(source).toEqual(snapshot);
  });

  it('falls back to the default sort for an unknown key', () => {
    expect(
      selectWorkouts(all, { sort: 'nonsense' }).map((w) => w.date.getDate())
    ).toEqual(
      selectWorkouts(all, { sort: DEFAULT_SORT }).map((w) => w.date.getDate())
    );
  });

  it('yields an empty list when nothing matches the filter', () => {
    expect(selectWorkouts([short, long], { filter: 'cycling' })).toEqual([]);
  });

  it('handles an empty source list', () => {
    expect(selectWorkouts([], { sort: 'distance' })).toEqual([]);
  });

  it('exposes a sorter per option', () => {
    expect(Object.keys(SORTERS)).toEqual([
      'newest',
      'oldest',
      'distance',
      'duration',
    ]);
  });
});
