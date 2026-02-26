export class WorkoutRenderer {
  #containerEl;
  #onWorkoutClick;

  constructor({ containerEl, onWorkoutClick }) {
    this.#containerEl = containerEl;
    this.#onWorkoutClick = onWorkoutClick;
    this.#containerEl.addEventListener('click', this.#handleClick.bind(this));
  }

  render(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__header">
          <h2 class="workout__title">${workout.description}</h2>
          <span class="workout__type-badge">${workout.emoji}</span>
        </div>
        <div class="workout__metrics">
          <div class="workout__details">
            <span class="workout__icon">📍</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          ${this.#buildSpecificFieldsHTML(workout)}
        </div>
      </li>
    `;

    const formEl = this.#containerEl.querySelector('.form');
    if (formEl) {
      formEl.insertAdjacentHTML('afterend', html);
    } else {
      this.#containerEl.insertAdjacentHTML('beforeend', html);
    }
  }

  renderAll(workouts) {
    workouts.forEach((workout) => this.render(workout));
  }

  #buildSpecificFieldsHTML(workout) {
    return workout
      .getSpecificFields()
      .map(
        ({ icon, value, unit }) => `
        <div class="workout__details">
          <span class="workout__icon">${icon}</span>
          <span class="workout__value">${value}</span>
          <span class="workout__unit">${unit}</span>
        </div>`
      )
      .join('');
  }

  #handleClick(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    this.#onWorkoutClick(workoutEl.dataset.id);
  }
}
