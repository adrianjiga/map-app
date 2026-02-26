import { describe, it, expect, beforeEach } from 'vitest';
import { WorkoutStorage } from '../storage/WorkoutStorage.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('WorkoutStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('load returns [] on empty storage', () => {
    expect(WorkoutStorage.load()).toEqual([]);
  });

  it('load returns [] on invalid JSON', () => {
    localStorage.setItem('workouts', 'not-valid-json{{{');
    expect(WorkoutStorage.load()).toEqual([]);
  });

  it('load returns [] on null storage value', () => {
    localStorage.setItem('workouts', 'null');
    expect(WorkoutStorage.load()).toEqual([]);
  });

  it('save and load round-trips a Running instance', () => {
    const r = new Running([10, 20], 5, 30, 160);
    WorkoutStorage.save([r]);
    const [restored] = WorkoutStorage.load();
    expect(restored.distance).toBe(5);
    expect(restored.duration).toBe(30);
    expect(restored.cadence).toBe(160);
  });

  it('restored Running is instanceof Running', () => {
    const r = new Running([10, 20], 5, 30, 160);
    WorkoutStorage.save([r]);
    const [restored] = WorkoutStorage.load();
    expect(restored instanceof Running).toBe(true);
  });

  it('restored Running has working getSpecificFields()', () => {
    const r = new Running([10, 20], 5, 30, 160);
    WorkoutStorage.save([r]);
    const [restored] = WorkoutStorage.load();
    const fields = restored.getSpecificFields();
    expect(fields).toHaveLength(2);
    expect(fields[0].unit).toBe('min/km');
  });

  it('restored Cycling is instanceof Cycling', () => {
    const c = new Cycling([10, 20], 20, 60, -200);
    WorkoutStorage.save([c]);
    const [restored] = WorkoutStorage.load();
    expect(restored instanceof Cycling).toBe(true);
  });

  it('restored date is a Date instance', () => {
    const r = new Running([10, 20], 5, 30, 160);
    WorkoutStorage.save([r]);
    const [restored] = WorkoutStorage.load();
    expect(restored.date).toBeInstanceOf(Date);
  });

  it('mixed workouts round-trip preserves order and types', () => {
    const r = new Running([0, 0], 5, 30, 160);
    const c = new Cycling([1, 1], 20, 60, 100);
    WorkoutStorage.save([r, c]);
    const loaded = WorkoutStorage.load();
    expect(loaded[0] instanceof Running).toBe(true);
    expect(loaded[1] instanceof Cycling).toBe(true);
  });
});
