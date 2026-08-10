import { Workout } from './Workout.js';
import { unitSystem, formatNumber } from '../units/units.js';

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

  getSpecificFields(unitsKey) {
    const system = unitSystem(unitsKey);
    const distance = system.distanceFromKm(this.distance);
    const speed = this.duration > 0 ? distance / (this.duration / 60) : 0;

    return [
      { icon: '⚡️', value: formatNumber(speed), unit: system.speedUnit },
      {
        icon: '⛰',
        value: formatNumber(system.elevationFromMetres(this.elevation), 0),
        unit: system.elevationUnit,
      },
    ];
  }
}
