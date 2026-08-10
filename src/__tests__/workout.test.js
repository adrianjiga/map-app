import { describe, it, expect, vi, afterEach } from 'vitest';
import { Workout } from '../workouts/Workout.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('Running', () => {
  it('calcPace returns duration / distance', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.pace).toBe(50 / 10);
  });

  it('id is a non-empty string', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(typeof r.id).toBe('string');
    expect(r.id.length).toBeGreaterThan(0);
  });

  it('ids are unique within the same millisecond', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const ids = new Set(
      Array.from({ length: 50 }, () => new Running([0, 0], 10, 50, 170).id)
    );
    vi.useRealTimers();
    expect(ids.size).toBe(50);
  });

  it('date is a Date instance', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.date).toBeInstanceOf(Date);
  });

  it('description is set after construction', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.description).toBeTruthy();
  });

  it('description starts with Running', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.description).toMatch(/^Running/);
  });

  it('description month is a word not a bare number', () => {
    const r = new Running([0, 0], 10, 50, 170);
    const monthPart = r.description.split('on ')[1].split(' ')[0];
    expect(/^\d+$/.test(monthPart)).toBe(false);
  });

  it('static emoji is correct', () => {
    expect(Running.emoji).toBe('🏃‍♂️');
  });

  it('static popupClass is correct', () => {
    expect(Running.popupClass).toBe('running-popup');
  });

  it('instance emoji getter matches static', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.emoji).toBe(Running.emoji);
  });

  it('getSpecificFields returns 2 entries', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.getSpecificFields()).toHaveLength(2);
  });

  it('getSpecificFields first entry is pace in min/km', () => {
    const r = new Running([0, 0], 10, 50, 170);
    const [pace] = r.getSpecificFields();
    expect(pace.unit).toBe('min/km');
  });
});

describe('Workout locale', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
  });

  it('follows the document language when one is declared', () => {
    document.documentElement.lang = 'en';
    expect(Workout.locale()).toBe('en');
  });

  it('falls back to the browser locale when lang is unset', () => {
    document.documentElement.removeAttribute('lang');
    expect(Workout.locale()).toBe(navigator.language);
  });

  it('formats descriptions with the document language', () => {
    document.documentElement.lang = 'en';
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.description).toMatch(/^Running on [A-Z][a-z]+ \d+$/);
  });
});

describe('Cycling', () => {
  it('calcSpeed returns distance / (duration / 60)', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(c.speed).toBe(20 / (60 / 60));
  });

  it('id is a non-empty string', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(typeof c.id).toBe('string');
    expect(c.id.length).toBeGreaterThan(0);
  });

  it('description starts with Cycling', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(c.description).toMatch(/^Cycling/);
  });

  it('static emoji is correct', () => {
    expect(Cycling.emoji).toBe('🚴‍♀️');
  });

  it('static popupClass is correct', () => {
    expect(Cycling.popupClass).toBe('cycling-popup');
  });

  it('getSpecificFields returns 2 entries', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(c.getSpecificFields()).toHaveLength(2);
  });

  it('getSpecificFields first entry is speed in km/h', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    const [speed] = c.getSpecificFields();
    expect(speed.unit).toBe('km/h');
  });
});
