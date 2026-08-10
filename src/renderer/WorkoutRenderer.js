export class WorkoutRenderer {
  #containerEl;
  #onWorkoutClick;
  #onWorkoutDelete;
  #onWorkoutEdit;
  #defaultEmptyMessage;

  constructor({ containerEl, onWorkoutClick, onWorkoutDelete, onWorkoutEdit }) {
    this.#containerEl = containerEl;
    this.#onWorkoutClick = onWorkoutClick;
    this.#onWorkoutDelete = onWorkoutDelete;
    this.#onWorkoutEdit = onWorkoutEdit;
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

    this.#syncEmptyState();
  }

  /**
   * Renders exactly the given list, in the given order. Used for every list
   * mutation once sorting exists, because an insert-at-top shortcut would
   * silently ignore the active sort.
   */
  renderAll(workouts, { emptyMessage } = {}) {
    this.clear();

    let anchorEl = this.#containerEl.querySelector('.form__item, .form');
    workouts.forEach((workout) => {
      const itemEl = this.#buildItem(workout);
      if (anchorEl) {
        anchorEl.after(itemEl);
        anchorEl = itemEl;
      } else {
        this.#containerEl.append(itemEl);
      }
    });

    this.#syncEmptyState(emptyMessage);
  }

  remove(workoutId) {
    this.#itemFor(workoutId)?.remove();
    this.#syncEmptyState();
  }

  // Replaces in place so an edited workout keeps its position in the list.
  replace(workoutId, workout) {
    const existingEl = this.#itemFor(workoutId);
    if (!existingEl) return;

    const replacementEl = this.#buildItem(workout);
    replacementEl.style.setProperty(
      '--card-index',
      existingEl.style.getPropertyValue('--card-index')
    );
    existingEl.replaceWith(replacementEl);
  }

  clear() {
    this.#containerEl
      .querySelectorAll('.workout')
      .forEach((itemEl) => itemEl.remove());
    this.#syncEmptyState();
  }

  #syncEmptyState(emptyMessage) {
    const emptyEl = this.#containerEl.querySelector('.workouts__empty');
    if (!emptyEl) return;

    this.#defaultEmptyMessage ??= emptyEl.textContent.trim();
    emptyEl.textContent = emptyMessage ?? this.#defaultEmptyMessage;
    emptyEl.hidden = this.#containerEl.querySelector('.workout') !== null;
  }

  #itemFor(workoutId) {
    return [...this.#containerEl.querySelectorAll('.workout')].find(
      (itemEl) => itemEl.dataset.id === workoutId
    );
  }

  // Built as nodes rather than interpolated HTML: every value here originates
  // from localStorage, so string templating would make any future free-text
  // field (a note, a custom title) a stored-XSS vector.
  #buildItem(workout) {
    const itemEl = document.createElement('li');
    itemEl.className = `workout workout--${workout.type}`;
    itemEl.dataset.id = workout.id;
    itemEl.style.setProperty(
      '--card-index',
      this.#containerEl.querySelectorAll('.workout').length
    );

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

    // Siblings of the select button, not children: buttons cannot nest.
    const actionsEl = document.createElement('span');
    actionsEl.className = 'workout__actions';
    actionsEl.append(
      this.#buildAction('workout__edit', '✎', `Edit ${workout.description}`),
      this.#buildAction('workout__delete', '✕', `Delete ${workout.description}`)
    );

    itemEl.append(buttonEl, actionsEl);
    return itemEl;
  }

  #buildAction(className, glyph, label) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `workout__action ${className}`;
    el.setAttribute('aria-label', label);
    el.textContent = glyph;
    return el;
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

    if (e.target.closest('.workout__delete')) {
      this.#onWorkoutDelete?.(workoutEl.dataset.id);
      return;
    }

    if (e.target.closest('.workout__edit')) {
      this.#onWorkoutEdit?.(workoutEl.dataset.id);
      return;
    }

    this.#onWorkoutClick(workoutEl.dataset.id);
  }
}
