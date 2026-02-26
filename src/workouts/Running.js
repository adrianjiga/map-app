import { Workout } from './Workout.js';

export class Running extends Workout {
  type = 'running';
  static emoji = '🏃‍♂️';
  static popupClass = 'running-popup';

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

  getSpecificFields() {
    return [
      { icon: '⚡️', value: this.pace.toFixed(1), unit: 'min/km' },
      { icon: '🦶🏼', value: this.cadence, unit: 'spm' },
    ];
  }
}
