import { VALIDATORS } from '../validation/validators.js';
import { unitSystem, formatNumber } from '../units/units.js';

export class WorkoutFormController {
  static ANIMATION_DURATION_MS = 1000;
  static ADD_LABEL = 'Add workout';
  static EDIT_LABEL = 'Save changes';

  #formEl;
  #submitEl;
  #inputType;
  #inputDistance;
  #inputDuration;
  #inputCadence;
  #inputElevation;
  #coords;
  #editingId = null;
  #prefill = null;
  #units;
  #onSubmit;
  #onValidationError;

  constructor({ containerEl, onSubmit, onValidationError, units }) {
    this.#units = units;
    this.#formEl = containerEl.querySelector('.form');
    this.#submitEl = containerEl.querySelector('.form__btn');
    this.#inputType = containerEl.querySelector('.form__input--type');
    this.#inputDistance = containerEl.querySelector('.form__input--distance');
    this.#inputDuration = containerEl.querySelector('.form__input--duration');
    this.#inputCadence = containerEl.querySelector('.form__input--cadence');
    this.#inputElevation = containerEl.querySelector('.form__input--elevation');
    this.#onSubmit = onSubmit;
    this.#onValidationError = onValidationError;

    this.#formEl.addEventListener('submit', this.#handleSubmit.bind(this));
    this.#inputType.addEventListener('change', () => this.#syncTypeFields());
    this.#syncTypeFields();
    this.#syncUnitLabels();
  }

  /**
   * The form reads and writes in the user's chosen units; everything that
   * leaves it is converted back to the canonical km/m before it reaches a
   * workout. Storage is never touched by a unit change.
   */
  setUnits(unitsKey) {
    this.#units = unitsKey;
    this.#syncUnitLabels();
  }

  #syncUnitLabels() {
    const system = unitSystem(this.#units);
    this.#inputDistance.placeholder = system.distanceUnit;
    this.#inputElevation.placeholder =
      system.elevationUnit === 'ft' ? 'feet' : 'meters';
  }

  show(mapEvent) {
    const { lat, lng } = mapEvent.latlng;
    this.#coords = [lat, lng];
    this.#editingId = null;
    this.#prefill = null;
    this.#clearInputs();
    this.#setLabel(WorkoutFormController.ADD_LABEL);
    this.#reveal();
  }

  /**
   * Reopens the form over an existing workout. Its coordinates are carried
   * through untouched — a workout is edited from the sidebar, not by re-clicking
   * the map, so there is no new position to take.
   */
  showForEdit(workout) {
    this.#coords = workout.coords;
    this.#editingId = workout.id;

    this.#inputType.value = workout.type;
    this.#syncTypeFields();
    const system = unitSystem(this.#units);
    const distanceDisplay = formatNumber(
      system.distanceFromKm(workout.distance),
      2
    );
    const elevationDisplay =
      workout.elevation === undefined
        ? ''
        : formatNumber(system.elevationFromMetres(workout.elevation), 0);

    this.#inputDistance.value = distanceDisplay;
    this.#inputDuration.value = workout.duration;
    this.#inputCadence.value = workout.cadence ?? '';
    this.#inputElevation.value = elevationDisplay;

    // Converting a rounded display value back to canonical units loses
    // precision: 10km shows as 6.21mi, which converts back to 9.994km. Remember
    // what was displayed so an untouched field returns its exact original.
    this.#prefill = {
      distance: { display: distanceDisplay, canonical: workout.distance },
      elevation: { display: elevationDisplay, canonical: workout.elevation },
    };

    this.#setLabel(WorkoutFormController.EDIT_LABEL);
    this.#reveal();
  }

  get isEditing() {
    return this.#editingId !== null;
  }

  hide() {
    this.#clearInputs();
    this.#editingId = null;
    this.#prefill = null;
    this.#setLabel(WorkoutFormController.ADD_LABEL);

    this.#formEl.style.display = 'none';
    this.#formEl.classList.add('hidden');
    setTimeout(
      () => (this.#formEl.style.display = 'grid'),
      WorkoutFormController.ANIMATION_DURATION_MS
    );
  }

  #setLabel(text) {
    if (this.#submitEl) this.#submitEl.textContent = text;
  }

  #reveal() {
    this.#formEl.classList.remove('hidden');
    this.#inputDistance.focus();
  }

  #clearInputs() {
    this.#inputDistance.value =
      this.#inputDuration.value =
      this.#inputCadence.value =
      this.#inputElevation.value =
        '';
  }

  // Set explicitly from the current type rather than toggled. Toggling desynced
  // whenever the type changed without a change event — a browser restoring the
  // select's value on a soft reload, or the form being populated in code.
  #syncTypeFields() {
    const isCycling = this.#inputType.value === 'cycling';
    this.#rowFor(this.#inputElevation).classList.toggle(
      'form__row--hidden',
      !isCycling
    );
    this.#rowFor(this.#inputCadence).classList.toggle(
      'form__row--hidden',
      isCycling
    );
  }

  #rowFor(inputEl) {
    return inputEl.closest('.form__row');
  }

  #readFormData() {
    const system = unitSystem(this.#units);
    return {
      type: this.#inputType.value,
      distance: this.#canonical('distance', this.#inputDistance, (value) =>
        system.distanceToKm(value)
      ),
      duration: +this.#inputDuration.value,
      cadence: +this.#inputCadence.value,
      elevation: this.#canonical('elevation', this.#inputElevation, (value) =>
        system.elevationToMetres(value)
      ),
      coords: this.#coords,
      editingId: this.#editingId,
    };
  }

  #canonical(field, inputEl, convert) {
    const kept = this.#prefill?.[field];
    if (
      kept &&
      kept.display === inputEl.value &&
      kept.canonical !== undefined
    ) {
      return kept.canonical;
    }
    return convert(+inputEl.value);
  }

  #handleSubmit(e) {
    e.preventDefault();
    const data = this.#readFormData();
    const validation = VALIDATORS[data.type](data);

    if (!validation.valid) {
      this.#onValidationError(validation.message);
      return;
    }

    this.#onSubmit(data);
    this.hide();
  }
}
