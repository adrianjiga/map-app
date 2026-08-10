import { unitSystem, formatNumber } from '../units/units.js';

export class WorkoutSummary {
  #el;
  #countEl;
  #distanceEl;
  #durationEl;
  #distanceLabelEl;

  constructor({ containerEl }) {
    this.#el = containerEl;
    this.#countEl = containerEl?.querySelector('[data-summary="count"]');
    this.#distanceEl = containerEl?.querySelector('[data-summary="distance"]');
    this.#durationEl = containerEl?.querySelector('[data-summary="duration"]');
    this.#distanceLabelEl = containerEl?.querySelector(
      '[data-summary-label="distance"]'
    );
  }

  render(workouts, unitsKey) {
    if (!this.#el) return;
    const system = unitSystem(unitsKey);

    this.#el.hidden = workouts.length === 0;
    if (workouts.length === 0) return;

    const totals = workouts.reduce(
      (acc, workout) => ({
        distance: acc.distance + workout.distance,
        duration: acc.duration + workout.duration,
      }),
      { distance: 0, duration: 0 }
    );

    if (this.#countEl) this.#countEl.textContent = workouts.length;
    if (this.#distanceEl) {
      this.#distanceEl.textContent = formatNumber(
        system.distanceFromKm(totals.distance)
      );
    }
    if (this.#distanceLabelEl) {
      this.#distanceLabelEl.textContent = `Total ${system.distanceUnit}`;
    }
    if (this.#durationEl) {
      this.#durationEl.textContent = WorkoutSummary.formatDuration(
        totals.duration
      );
    }
  }

  // Floats accumulate noise (0.1 + 0.2); one decimal is all the UI shows.
  static formatDistance(km) {
    return Number.isInteger(km) ? String(km) : km.toFixed(1);
  }

  static formatDuration(minutes) {
    const whole = Math.round(minutes);
    const hours = Math.floor(whole / 60);
    const mins = whole % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
}
