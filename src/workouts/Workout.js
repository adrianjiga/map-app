export class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const formatted = new Intl.DateTimeFormat(navigator.language, {
      month: 'long',
      day: 'numeric',
    }).format(this.date);

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${formatted}`;
  }
}
