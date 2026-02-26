import { describe, it, expect } from 'vitest';
import {
  isFiniteNumber,
  isPositive,
  validateRunning,
  validateCycling,
  VALIDATORS,
} from '../validation/validators.js';

describe('isFiniteNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isFiniteNumber(1, 2, 3)).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isFiniteNumber(1, NaN, 3)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isFiniteNumber(1, Infinity)).toBe(false);
  });
});

describe('isPositive', () => {
  it('returns true for all positive numbers', () => {
    expect(isPositive(1, 2, 3)).toBe(true);
  });

  it('returns false when zero is included', () => {
    expect(isPositive(1, 0, 3)).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isPositive(1, -5)).toBe(false);
  });
});

describe('validateRunning', () => {
  it('returns valid: true for correct inputs', () => {
    const result = validateRunning({ distance: 5, duration: 30, cadence: 160 });
    expect(result.valid).toBe(true);
  });

  it('returns valid: false when distance is NaN', () => {
    const result = validateRunning({
      distance: NaN,
      duration: 30,
      cadence: 160,
    });
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('returns valid: false for negative distance', () => {
    const result = validateRunning({
      distance: -5,
      duration: 30,
      cadence: 160,
    });
    expect(result.valid).toBe(false);
  });

  it('returns valid: false for zero cadence', () => {
    const result = validateRunning({ distance: 5, duration: 30, cadence: 0 });
    expect(result.valid).toBe(false);
  });
});

describe('validateCycling', () => {
  it('returns valid: true for correct inputs', () => {
    const result = validateCycling({
      distance: 20,
      duration: 60,
      elevation: 500,
    });
    expect(result.valid).toBe(true);
  });

  it('allows negative elevation (downhill bug fix)', () => {
    const result = validateCycling({
      distance: 20,
      duration: 60,
      elevation: -300,
    });
    expect(result.valid).toBe(true);
  });

  it('allows zero elevation', () => {
    const result = validateCycling({
      distance: 20,
      duration: 60,
      elevation: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('returns valid: false for non-finite distance', () => {
    const result = validateCycling({
      distance: NaN,
      duration: 60,
      elevation: 100,
    });
    expect(result.valid).toBe(false);
  });

  it('returns valid: false for negative distance', () => {
    const result = validateCycling({
      distance: -10,
      duration: 60,
      elevation: 100,
    });
    expect(result.valid).toBe(false);
  });
});

describe('VALIDATORS registry', () => {
  it('has running and cycling keys', () => {
    expect(typeof VALIDATORS.running).toBe('function');
    expect(typeof VALIDATORS.cycling).toBe('function');
  });

  it('VALIDATORS.running delegates to validateRunning', () => {
    const result = VALIDATORS.running({ distance: 5, duration: 30, cadence: 160 });
    expect(result.valid).toBe(true);
  });
});
