const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export class Workout {
  date = new Date();
  id = createId();

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  // The document declares lang="en" and every string in the UI is English, so
  // formatting dates in the browser's locale would contradict the declaration.
  // Follow the document, falling back to the browser when it is unset.
  static locale() {
    return globalThis.document?.documentElement?.lang || navigator.language;
  }

  _setDescription() {
    const formatted = new Intl.DateTimeFormat(Workout.locale(), {
      month: 'long',
      day: 'numeric',
    }).format(this.date);

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${formatted}`;
  }
}
