import { describe, it, expect } from 'vitest';
import {
  serializeWorkouts,
  parseWorkouts,
  exportFilename,
  TRANSFER_VERSION,
} from '../storage/WorkoutTransfer.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

const run = () => new Running([51.5, -0.09], 5, 30, 170);
const ride = () => new Cycling([51.5, -0.09], 20, 60, 250);

describe('serializeWorkouts', () => {
  it('wraps workouts with a version and timestamp', () => {
    const payload = JSON.parse(serializeWorkouts([run()]));
    expect(payload.version).toBe(TRANSFER_VERSION);
    expect(typeof payload.exportedAt).toBe('string');
    expect(payload.workouts).toHaveLength(1);
  });

  it('round-trips through parseWorkouts', () => {
    const original = run();
    const { workouts, skipped } = parseWorkouts(serializeWorkouts([original]));

    expect(skipped).toBe(0);
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toBeInstanceOf(Running);
    expect(workouts[0].id).toBe(original.id);
    expect(workouts[0].distance).toBe(5);
    expect(workouts[0].date.getTime()).toBe(original.date.getTime());
  });

  it('round-trips both workout types', () => {
    const { workouts } = parseWorkouts(serializeWorkouts([run(), ride()]));
    expect(workouts[0]).toBeInstanceOf(Running);
    expect(workouts[1]).toBeInstanceOf(Cycling);
    expect(workouts[1].elevation).toBe(250);
  });
});

describe('exportFilename', () => {
  it('is dated', () => {
    expect(exportFilename(new Date('2026-08-10T12:00:00Z'))).toBe(
      'workouts-2026-08-10.json'
    );
  });
});

describe('parseWorkouts', () => {
  it('reports invalid JSON without throwing', () => {
    const result = parseWorkouts('not json {{{');
    expect(result.workouts).toEqual([]);
    expect(result.error).toMatch(/valid JSON/);
  });

  it('rejects a file that is not an export', () => {
    const result = parseWorkouts(JSON.stringify({ hello: 'world' }));
    expect(result.error).toMatch(/workout export/);
  });

  it('accepts a bare array for forward compatibility', () => {
    const payload = JSON.parse(serializeWorkouts([run()]));
    const { workouts } = parseWorkouts(JSON.stringify(payload.workouts));
    expect(workouts).toHaveLength(1);
  });

  it('skips entries with an unknown type', () => {
    const result = parseWorkouts(
      JSON.stringify([{ type: 'swimming', distance: 1, duration: 1 }])
    );
    expect(result.workouts).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it('skips entries failing the same validators the form uses', () => {
    const bad = { ...JSON.parse(JSON.stringify(run())), distance: -5 };
    const result = parseWorkouts(JSON.stringify([bad]));
    expect(result.skipped).toBe(1);
  });

  it('skips entries with out-of-range coordinates', () => {
    const bad = { ...JSON.parse(JSON.stringify(run())), coords: [999, 0] };
    expect(parseWorkouts(JSON.stringify([bad])).skipped).toBe(1);
  });

  it('skips entries with malformed coordinates', () => {
    const bad = { ...JSON.parse(JSON.stringify(run())), coords: 'here' };
    expect(parseWorkouts(JSON.stringify([bad])).skipped).toBe(1);
  });

  it('skips entries with an unparseable date', () => {
    const bad = { ...JSON.parse(JSON.stringify(run())), date: 'someday' };
    expect(parseWorkouts(JSON.stringify([bad])).skipped).toBe(1);
  });

  it('keeps the good entries alongside the bad', () => {
    const good = JSON.parse(JSON.stringify(run()));
    const result = parseWorkouts(
      JSON.stringify([good, { type: 'nonsense' }, null])
    );
    expect(result.workouts).toHaveLength(1);
    expect(result.skipped).toBe(2);
  });

  it('recomputes the description instead of trusting the file', () => {
    const tampered = {
      ...JSON.parse(JSON.stringify(run())),
      description: '<img src=x onerror=alert(1)>',
    };
    const { workouts } = parseWorkouts(JSON.stringify([tampered]));
    expect(workouts[0].description).toMatch(/^Running on /);
  });

  it('recomputes derived pace rather than trusting the file', () => {
    const tampered = { ...JSON.parse(JSON.stringify(run())), pace: 9999 };
    const { workouts } = parseWorkouts(JSON.stringify([tampered]));
    expect(workouts[0].pace).toBe(30 / 5);
  });

  it('generates an id when the file omits one', () => {
    const entry = JSON.parse(JSON.stringify(run()));
    delete entry.id;
    const { workouts } = parseWorkouts(JSON.stringify([entry]));
    expect(typeof workouts[0].id).toBe('string');
    expect(workouts[0].id.length).toBeGreaterThan(0);
  });

  it('handles an empty export', () => {
    const result = parseWorkouts(serializeWorkouts([]));
    expect(result.workouts).toEqual([]);
    expect(result.skipped).toBe(0);
    expect(result.error).toBeUndefined();
  });
});
