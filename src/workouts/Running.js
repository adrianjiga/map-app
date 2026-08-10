import { Workout } from './Workout.js';
import { unitSystem, formatNumber } from '../units/units.js';

export class Running extends Workout {
  type = 'running';
  static emoji = '🏃‍♂️';
  static popupClass = 'running-popup';

  static fromFormData({ coords, distance, duration, cadence }) {
    return new Running(coords, distance, duration, cadence);
  }

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  get emoji() {
    return Running.emoji;
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }

  // Pace is recomputed from the converted distance rather than converting the
  // stored min/km figure, so the displayed unit and value can never disagree.
  getSpecificFields(unitsKey) {
    const system = unitSystem(unitsKey);
    const distance = system.distanceFromKm(this.distance);
    const pace = distance > 0 ? this.duration / distance : 0;

    return [
      { icon: '⚡️', value: formatNumber(pace), unit: system.paceUnit },
      { icon: '🦶🏼', value: this.cadence, unit: 'spm' },
    ];
  }
}
