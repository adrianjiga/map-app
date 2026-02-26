import { VALIDATORS } from '../validation/validators.js';

export class WorkoutFormController {
  static ANIMATION_DURATION_MS = 1000;

  #formEl;
  #inputType;
  #inputDistance;
  #inputDuration;
  #inputCadence;
  #inputElevation;
  #mapEvent;
  #onSubmit;
  #onValidationError;

  constructor({ containerEl, onSubmit, onValidationError }) {
    this.#formEl = containerEl.querySelector('.form');
    this.#inputType = containerEl.querySelector('.form__input--type');
    this.#inputDistance = containerEl.querySelector('.form__input--distance');
    this.#inputDuration = containerEl.querySelector('.form__input--duration');
    this.#inputCadence = containerEl.querySelector('.form__input--cadence');
    this.#inputElevation = containerEl.querySelector('.form__input--elevation');
    this.#onSubmit = onSubmit;
    this.#onValidationError = onValidationError;

    this.#formEl.addEventListener('submit', this.#handleSubmit.bind(this));
    this.#inputType.addEventListener(
      'change',
      this.#toggleElevationField.bind(this)
    );
  }

  show(mapEvent) {
    this.#mapEvent = mapEvent;
    this.#formEl.classList.remove('hidden');
    this.#inputDistance.focus();
  }

  hide() {
    this.#inputDistance.value =
      this.#inputDuration.value =
      this.#inputCadence.value =
      this.#inputElevation.value =
        '';

    this.#formEl.style.display = 'none';
    this.#formEl.classList.add('hidden');
    setTimeout(
      () => (this.#formEl.style.display = 'grid'),
      WorkoutFormController.ANIMATION_DURATION_MS
    );
  }

  #toggleElevationField() {
    this.#inputElevation
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
    this.#inputCadence
      .closest('.form__row')
      .classList.toggle('form__row--hidden');
  }

  #readFormData() {
    const type = this.#inputType.value;
    const distance = +this.#inputDistance.value;
    const duration = +this.#inputDuration.value;
    const cadence = +this.#inputCadence.value;
    const elevation = +this.#inputElevation.value;
    const { lat, lng } = this.#mapEvent.latlng;
    return { type, distance, duration, cadence, elevation, coords: [lat, lng] };
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
