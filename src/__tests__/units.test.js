import { describe, it, expect } from 'vitest';
import {
  unitSystem,
  formatNumber,
  KM_PER_MILE,
  METRES_PER_FOOT,
  DEFAULT_UNITS,
} from '../units/units.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('unit systems', () => {
  it('falls back to the default for an unknown key', () => {
    expect(unitSystem('klingon').key).toBe(DEFAULT_UNITS);
  });

  it('metric is a pass-through', () => {
    const metric = unitSystem('metric');
    expect(metric.distanceFromKm(10)).toBe(10);
    expect(metric.distanceToKm(10)).toBe(10);
    expect(metric.elevationFromMetres(250)).toBe(250);
  });

  it('imperial converts distance both ways', () => {
    const imperial = unitSystem('imperial');
    expect(imperial.distanceFromKm(KM_PER_MILE)).toBeCloseTo(1, 10);
    expect(imperial.distanceToKm(1)).toBeCloseTo(KM_PER_MILE, 10);
  });

  it('imperial converts elevation both ways', () => {
    const imperial = unitSystem('imperial');
    expect(imperial.elevationFromMetres(METRES_PER_FOOT)).toBeCloseTo(1, 10);
    expect(imperial.elevationToMetres(1)).toBeCloseTo(METRES_PER_FOOT, 10);
  });

  it('round-trips without drift at full precision', () => {
    const imperial = unitSystem('imperial');
    const km = 10;
    expect(imperial.distanceToKm(imperial.distanceFromKm(km))).toBeCloseTo(
      km,
      10
    );
  });
});

describe('formatNumber', () => {
  it('keeps whole numbers integral', () => {
    expect(formatNumber(10)).toBe('10');
  });

  it('rounds to one decimal by default', () => {
    expect(formatNumber(6.2137)).toBe('6.2');
  });

  it('honours an explicit precision', () => {
    expect(formatNumber(6.2137, 2)).toBe('6.21');
    expect(formatNumber(820.2, 0)).toBe('820');
  });

  it('absorbs float noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
  });
});

describe('workout fields respect the unit system', () => {
  it('running shows km and min/km by default', () => {
    const r = new Running([0, 0], 10, 50, 170);
    const [pace] = r.getSpecificFields('metric');
    expect(pace.unit).toBe('min/km');
    expect(pace.value).toBe('5');
  });

  it('running recomputes pace per mile, not by converting min/km', () => {
    const r = new Running([0, 0], 10, 50, 170);
    const [pace] = r.getSpecificFields('imperial');
    expect(pace.unit).toBe('min/mi');
    // 10km = 6.2137mi, 50min / 6.2137 = 8.05 min/mi
    expect(Number(pace.value)).toBeCloseTo(8, 1);
  });

  it('cycling shows mph and feet in imperial', () => {
    const c = new Cycling([0, 0], 32.18688, 60, 304.8);
    const [speed, elevation] = c.getSpecificFields('imperial');
    expect(speed.unit).toBe('mph');
    expect(Number(speed.value)).toBeCloseTo(20, 1);
    expect(elevation.unit).toBe('ft');
    expect(Number(elevation.value)).toBeCloseTo(1000, 0);
  });

  it('does not divide by zero on a zero-duration workout', () => {
    const c = new Cycling([0, 0], 10, 0, 100);
    const [speed] = c.getSpecificFields('metric');
    expect(Number.isFinite(Number(speed.value))).toBe(true);
  });
});
