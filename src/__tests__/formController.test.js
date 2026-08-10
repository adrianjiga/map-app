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

  const actionsRow = document.createElement('div');
  actionsRow.className = 'form__row form__row--actions';
  const submitBtn = document.createElement('button');
  submitBtn.className = 'form__btn';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Add workout';
  actionsRow.appendChild(submitBtn);

  formEl.append(typeRow, distRow, durRow, elevRow, cadRow, actionsRow);
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

  it('switching to cycling shows elevation and hides cadence', () => {
    const typeEl = containerEl.querySelector('.form__input--type');
    typeEl.value = 'cycling';
    typeEl.dispatchEvent(new Event('change'));

    const rowOf = (sel) => containerEl.querySelector(sel).closest('.form__row');
    expect(
      rowOf('.form__input--elevation').classList.contains('form__row--hidden')
    ).toBe(false);
    expect(
      rowOf('.form__input--cadence').classList.contains('form__row--hidden')
    ).toBe(true);
  });

  it('switching back to running restores the cadence field', () => {
    const typeEl = containerEl.querySelector('.form__input--type');
    typeEl.value = 'cycling';
    typeEl.dispatchEvent(new Event('change'));
    typeEl.value = 'running';
    typeEl.dispatchEvent(new Event('change'));

    const rowOf = (sel) => containerEl.querySelector(sel).closest('.form__row');
    expect(
      rowOf('.form__input--cadence').classList.contains('form__row--hidden')
    ).toBe(false);
    expect(
      rowOf('.form__input--elevation').classList.contains('form__row--hidden')
    ).toBe(true);
  });

  it('corrects a desynced type on construction, without a change event', () => {
    // A browser restoring the select value on soft reload fires no event.
    const dom = buildFormDOM();
    dom.querySelector('.form__input--type').value = 'cycling';
    document.body.appendChild(dom);

    new WorkoutFormController({
      containerEl: dom,
      onSubmit: vi.fn(),
      onValidationError: vi.fn(),
    });

    const rowOf = (sel) => dom.querySelector(sel).closest('.form__row');
    expect(
      rowOf('.form__input--elevation').classList.contains('form__row--hidden')
    ).toBe(false);
    expect(
      rowOf('.form__input--cadence').classList.contains('form__row--hidden')
    ).toBe(true);
    document.body.removeChild(dom);
  });

  describe('edit mode', () => {
    const workout = {
      id: 'abc',
      type: 'cycling',
      coords: [1, 2],
      distance: 20,
      duration: 60,
      elevation: 300,
    };

    it('prefills the form from the workout', () => {
      controller.showForEdit(workout);

      expect(containerEl.querySelector('.form__input--type').value).toBe(
        'cycling'
      );
      expect(containerEl.querySelector('.form__input--distance').value).toBe(
        '20'
      );
      expect(containerEl.querySelector('.form__input--elevation').value).toBe(
        '300'
      );
    });

    it('shows the fields matching the edited type', () => {
      controller.showForEdit(workout);

      const rowOf = (sel) =>
        containerEl.querySelector(sel).closest('.form__row');
      expect(
        rowOf('.form__input--elevation').classList.contains('form__row--hidden')
      ).toBe(false);
      expect(
        rowOf('.form__input--cadence').classList.contains('form__row--hidden')
      ).toBe(true);
    });

    it('relabels the submit button', () => {
      controller.showForEdit(workout);
      expect(containerEl.querySelector('.form__btn').textContent).toBe(
        WorkoutFormController.EDIT_LABEL
      );
    });

    it('submits with the editing id and the original coordinates', () => {
      controller.showForEdit(workout);
      containerEl
        .querySelector('.form')
        .dispatchEvent(new Event('submit', { cancelable: true }));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          editingId: 'abc',
          coords: [1, 2],
          distance: 20,
        })
      );
    });

    it('a map click cancels a pending edit', () => {
      controller.showForEdit(workout);
      expect(controller.isEditing).toBe(true);

      controller.show({ latlng: { lat: 9, lng: 9 } });

      expect(controller.isEditing).toBe(false);
      expect(containerEl.querySelector('.form__input--distance').value).toBe(
        ''
      );
      expect(containerEl.querySelector('.form__btn').textContent).toBe(
        WorkoutFormController.ADD_LABEL
      );
    });

    it('submitting clears edit mode for the next open', () => {
      controller.showForEdit(workout);
      containerEl
        .querySelector('.form')
        .dispatchEvent(new Event('submit', { cancelable: true }));

      expect(controller.isEditing).toBe(false);
      expect(containerEl.querySelector('.form__btn').textContent).toBe(
        WorkoutFormController.ADD_LABEL
      );
    });

    it('prefills in the active unit system', () => {
      controller.setUnits('imperial');
      controller.showForEdit({ ...workout, distance: 10 });

      expect(
        Number(containerEl.querySelector('.form__input--distance').value)
      ).toBeCloseTo(6.21, 2);
    });

    it('an untouched field keeps its exact stored value', () => {
      controller.setUnits('imperial');
      controller.showForEdit({ ...workout, distance: 10, elevation: 250 });

      containerEl
        .querySelector('.form')
        .dispatchEvent(new Event('submit', { cancelable: true }));

      // Converting the rounded 6.21mi back would have produced 9.994km.
      const [data] = onSubmit.mock.calls.at(-1);
      expect(data.distance).toBe(10);
      expect(data.elevation).toBe(250);
    });

    it('a changed field is converted from the active unit', () => {
      controller.setUnits('imperial');
      controller.showForEdit({ ...workout, distance: 10 });

      containerEl.querySelector('.form__input--distance').value = '1';
      containerEl
        .querySelector('.form')
        .dispatchEvent(new Event('submit', { cancelable: true }));

      const [data] = onSubmit.mock.calls.at(-1);
      expect(data.distance).toBeCloseTo(1.609344, 6);
    });

    it('a failed edit keeps the form in edit mode', () => {
      controller.showForEdit({ ...workout, distance: 20 });
      containerEl.querySelector('.form__input--distance').value = '-1';
      containerEl
        .querySelector('.form')
        .dispatchEvent(new Event('submit', { cancelable: true }));

      expect(onValidationError).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(controller.isEditing).toBe(true);
    });
  });

  it('a new workout in imperial units is stored in kilometres', () => {
    controller.setUnits('imperial');
    controller.show({ latlng: { lat: 1, lng: 2 } });

    containerEl.querySelector('.form__input--distance').value = '1';
    containerEl.querySelector('.form__input--duration').value = '30';
    containerEl.querySelector('.form__input--cadence').value = '170';
    containerEl
      .querySelector('.form')
      .dispatchEvent(new Event('submit', { cancelable: true }));

    const [data] = onSubmit.mock.calls.at(-1);
    expect(data.distance).toBeCloseTo(1.609344, 6);
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
