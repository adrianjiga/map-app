import { Workout } from './Workout.js';

export class Cycling extends Workout {
  type = 'cycling';
  static emoji = '🚴‍♀️';
  static popupClass = 'cycling-popup';

  static fromFormData({ coords, distance, duration, elevation }) {
    return new Cycling(coords, distance, duration, elevation);
  }

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  get emoji() {
    return Cycling.emoji;
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }

  getSpecificFields() {
    return [
      { icon: '⚡️', value: this.speed.toFixed(1), unit: 'km/h' },
      { icon: '⛰', value: this.elevation, unit: 'm' },
    ];
  }
}
