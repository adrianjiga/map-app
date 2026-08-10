export class WorkoutSummary {
  #el;
  #countEl;
  #distanceEl;
  #durationEl;

  constructor({ containerEl }) {
    this.#el = containerEl;
    this.#countEl = containerEl?.querySelector('[data-summary="count"]');
    this.#distanceEl = containerEl?.querySelector('[data-summary="distance"]');
    this.#durationEl = containerEl?.querySelector('[data-summary="duration"]');
  }

  render(workouts) {
    if (!this.#el) return;

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
      this.#distanceEl.textContent = WorkoutSummary.formatDistance(
        totals.distance
      );
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
