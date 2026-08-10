export class WorkoutRenderer {
  #containerEl;
  #onWorkoutClick;

  constructor({ containerEl, onWorkoutClick }) {
    this.#containerEl = containerEl;
    this.#onWorkoutClick = onWorkoutClick;
    this.#containerEl.addEventListener('click', this.#handleClick.bind(this));
  }

  render(workout) {
    const itemEl = this.#buildItem(workout);
    const anchorEl = this.#containerEl.querySelector('.form__item, .form');

    if (anchorEl) {
      anchorEl.after(itemEl);
    } else {
      this.#containerEl.append(itemEl);
    }
  }

  renderAll(workouts) {
    workouts.forEach((workout) => this.render(workout));
  }

  // Built as nodes rather than interpolated HTML: every value here originates
  // from localStorage, so string templating would make any future free-text
  // field (a note, a custom title) a stored-XSS vector.
  #buildItem(workout) {
    const itemEl = document.createElement('li');
    itemEl.className = `workout workout--${workout.type}`;
    itemEl.dataset.id = workout.id;

    // A real <button> carries keyboard operability, focus and Enter/Space for
    // free. Its content model is phrasing content only, hence spans throughout.
    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.className = 'workout__select';

    const headerEl = document.createElement('span');
    headerEl.className = 'workout__header';

    const titleEl = document.createElement('span');
    titleEl.className = 'workout__title';
    titleEl.textContent = workout.description;

    const badgeEl = document.createElement('span');
    badgeEl.className = 'workout__type-badge';
    badgeEl.setAttribute('aria-hidden', 'true');
    badgeEl.textContent = workout.emoji;

    headerEl.append(titleEl, badgeEl);

    const metricsEl = document.createElement('span');
    metricsEl.className = 'workout__metrics';
    metricsEl.append(
      this.#buildDetail('📍', workout.distance, 'km'),
      this.#buildDetail('⏱', workout.duration, 'min'),
      ...workout
        .getSpecificFields()
        .map(({ icon, value, unit }) => this.#buildDetail(icon, value, unit))
    );

    buttonEl.append(headerEl, metricsEl);
    itemEl.append(buttonEl);
    return itemEl;
  }

  #buildDetail(icon, value, unit) {
    const detailEl = document.createElement('span');
    detailEl.className = 'workout__details';

    const iconEl = document.createElement('span');
    iconEl.className = 'workout__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;

    const valueEl = document.createElement('span');
    valueEl.className = 'workout__value';
    valueEl.textContent = value;

    const unitEl = document.createElement('span');
    unitEl.className = 'workout__unit';
    unitEl.textContent = unit;

    detailEl.append(iconEl, valueEl, unitEl);
    return detailEl;
  }

  #handleClick(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    this.#onWorkoutClick(workoutEl.dataset.id);
  }
}
