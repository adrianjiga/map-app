import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkoutSummary } from '../ui/WorkoutSummary.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

function buildSummaryDOM() {
  const el = document.createElement('div');
  el.className = 'workout-summary';
  el.hidden = true;
  el.innerHTML = `
    <p><span class="v" data-summary="count">0</span></p>
    <p><span class="v" data-summary="distance">0</span></p>
    <p><span class="v" data-summary="duration">0</span></p>
  `;
  return el;
}

describe('WorkoutSummary', () => {
  let containerEl;
  let summary;

  const valueOf = (name) =>
    containerEl.querySelector(`[data-summary="${name}"]`).textContent;

  beforeEach(() => {
    containerEl = buildSummaryDOM();
    document.body.appendChild(containerEl);
    summary = new WorkoutSummary({ containerEl });
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('stays hidden with no workouts', () => {
    summary.render([]);
    expect(containerEl.hidden).toBe(true);
  });

  it('becomes visible once there is a workout', () => {
    summary.render([new Running([0, 0], 5, 30, 160)]);
    expect(containerEl.hidden).toBe(false);
  });

  it('counts workouts across types', () => {
    summary.render([
      new Running([0, 0], 5, 30, 160),
      new Cycling([1, 1], 20, 60, 100),
    ]);
    expect(valueOf('count')).toBe('2');
  });

  it('totals distance across workouts', () => {
    summary.render([
      new Running([0, 0], 5, 30, 160),
      new Cycling([1, 1], 20, 60, 100),
    ]);
    expect(valueOf('distance')).toBe('25');
  });

  it('totals duration and formats hours past 60 minutes', () => {
    summary.render([
      new Running([0, 0], 5, 30, 160),
      new Cycling([1, 1], 20, 95, 100),
    ]);
    expect(valueOf('duration')).toBe('2h 5m');
  });

  it('shows minutes only below an hour', () => {
    summary.render([new Running([0, 0], 5, 45, 160)]);
    expect(valueOf('duration')).toBe('45m');
  });

  it('hides re-render back to empty', () => {
    summary.render([new Running([0, 0], 5, 30, 160)]);
    summary.render([]);
    expect(containerEl.hidden).toBe(true);
  });

  it('tolerates a missing container', () => {
    const detached = new WorkoutSummary({ containerEl: null });
    expect(() =>
      detached.render([new Running([0, 0], 5, 30, 160)])
    ).not.toThrow();
  });

  describe('formatting helpers', () => {
    it('keeps whole distances integral', () => {
      expect(WorkoutSummary.formatDistance(25)).toBe('25');
    });

    it('rounds fractional distances to one decimal', () => {
      expect(WorkoutSummary.formatDistance(0.1 + 0.2)).toBe('0.3');
      expect(WorkoutSummary.formatDistance(12.34)).toBe('12.3');
    });

    it('formats exact hours without stray minutes', () => {
      expect(WorkoutSummary.formatDuration(120)).toBe('2h 0m');
    });

    it('rounds fractional minutes', () => {
      expect(WorkoutSummary.formatDuration(30.6)).toBe('31m');
    });
  });
});
