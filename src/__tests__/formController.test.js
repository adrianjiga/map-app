import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutFormController } from '../form/WorkoutFormController.js';

function buildFormDOM() {
  const workoutsEl = document.createElement('ul');
  workoutsEl.className = 'workouts';

  const formEl = document.createElement('form');
  formEl.className = 'form hidden';

  const typeRow = document.createElement('div');
  typeRow.className = 'form__row';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'form__input form__input--type';
  const runOpt = document.createElement('option');
  runOpt.value = 'running';
  runOpt.textContent = 'Running';
  const cycleOpt = document.createElement('option');
  cycleOpt.value = 'cycling';
  cycleOpt.textContent = 'Cycling';
  typeSelect.append(runOpt, cycleOpt);
  typeRow.appendChild(typeSelect);

  const distRow = document.createElement('div');
  distRow.className = 'form__row';
  const distInput = document.createElement('input');
  distInput.className = 'form__input form__input--distance';
  distRow.appendChild(distInput);

  const durRow = document.createElement('div');
  durRow.className = 'form__row';
  const durInput = document.createElement('input');
  durInput.className = 'form__input form__input--duration';
  durRow.appendChild(durInput);

  const elevRow = document.createElement('div');
  elevRow.className = 'form__row form__row--hidden';
  const elevInput = document.createElement('input');
  elevInput.className = 'form__input form__input--elevation';
  elevRow.appendChild(elevInput);

  const cadRow = document.createElement('div');
  cadRow.className = 'form__row';
  const cadInput = document.createElement('input');
  cadInput.className = 'form__input form__input--cadence';
  cadRow.appendChild(cadInput);

  formEl.append(typeRow, distRow, durRow, elevRow, cadRow);
  workoutsEl.appendChild(formEl);
  return workoutsEl;
}

describe('WorkoutFormController', () => {
  let containerEl;
  let onSubmit;
  let onValidationError;
  let controller;

  beforeEach(() => {
    containerEl = buildFormDOM();
    document.body.appendChild(containerEl);
    onSubmit = vi.fn();
    onValidationError = vi.fn();
    controller = new WorkoutFormController({
      containerEl,
      onSubmit,
      onValidationError,
    });
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
    vi.useRealTimers();
  });

  it('show removes hidden class from the form', () => {
    const mapEvent = { latlng: { lat: 10, lng: 20 } };
    controller.show(mapEvent);
    expect(
      containerEl.querySelector('.form').classList.contains('hidden')
    ).toBe(false);
  });

  it('hide sets display:none immediately', () => {
    vi.useFakeTimers();
    controller.hide();
    expect(containerEl.querySelector('.form').style.display).toBe('none');
  });

  it('hide restores display:grid after ANIMATION_DURATION_MS', () => {
    vi.useFakeTimers();
    controller.hide();
    vi.advanceTimersByTime(WorkoutFormController.ANIMATION_DURATION_MS);
    expect(containerEl.querySelector('.form').style.display).toBe('grid');
  });

  it('valid running submission fires onSubmit with correct shape', () => {
    const mapEvent = { latlng: { lat: 10, lng: 20 } };
    controller.show(mapEvent);

    containerEl.querySelector('.form__input--distance').value = '5';
    containerEl.querySelector('.form__input--duration').value = '30';
    containerEl.querySelector('.form__input--cadence').value = '160';

    containerEl
      .querySelector('.form')
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'running',
        distance: 5,
        duration: 30,
        cadence: 160,
        coords: [10, 20],
      })
    );
  });

  it('invalid input fires onValidationError, not onSubmit', () => {
    const mapEvent = { latlng: { lat: 10, lng: 20 } };
    controller.show(mapEvent);
    // All inputs empty → 0 values → fail isPositive

    containerEl
      .querySelector('.form')
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onValidationError).toHaveBeenCalled();
  });

  it('negative elevation cycling is valid (downhill)', () => {
    const mapEvent = { latlng: { lat: 5, lng: 10 } };
    controller.show(mapEvent);

    containerEl.querySelector('.form__input--type').value = 'cycling';
    containerEl.querySelector('.form__input--distance').value = '20';
    containerEl.querySelector('.form__input--duration').value = '60';
    containerEl.querySelector('.form__input--elevation').value = '-200';

    containerEl
      .querySelector('.form')
      .dispatchEvent(new Event('submit', { cancelable: true }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cycling',
        distance: 20,
        duration: 60,
        elevation: -200,
      })
    );
  });
});
