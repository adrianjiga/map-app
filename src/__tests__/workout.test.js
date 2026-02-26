import { describe, it, expect } from 'vitest';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('Running', () => {
  it('calcPace returns duration / distance', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(r.pace).toBe(50 / 10);
  });

  it('id is 10-char string', () => {
    const r = new Running([0, 0], 10, 50, 170);
    expect(typeof r.id).toBe('string');
    expect(r.id).toHaveLength(10);
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

describe('Cycling', () => {
  it('calcSpeed returns distance / (duration / 60)', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(c.speed).toBe(20 / (60 / 60));
  });

  it('id is 10-char string', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    expect(c.id).toHaveLength(10);
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
