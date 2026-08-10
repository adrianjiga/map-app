import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  maps: [],
  forms: [],
  renderers: [],
  banners: [],
  // Set before `new App()` to control what MapService.init() settles with.
  initResult: null,
}));

vi.mock('../map/MapService.js', () => ({
  MapService: class {
    constructor(opts) {
      this.opts = opts;
      this.init = vi.fn(() => mocks.initResult ?? Promise.resolve());
      this.renderMarker = vi.fn();
      this.removeMarker = vi.fn();
      this.removeAllMarkers = vi.fn();
      this.moveToWorkout = vi.fn();
      this.fitToWorkouts = vi.fn();
      this.renderStoredMarkers = vi.fn();
      mocks.maps.push(this);
    }
  },
}));

vi.mock('../form/WorkoutFormController.js', () => ({
  WorkoutFormController: class {
    constructor(opts) {
      this.opts = opts;
      this.show = vi.fn();
      this.hide = vi.fn();
      mocks.forms.push(this);
    }
  },
}));

vi.mock('../renderer/WorkoutRenderer.js', () => ({
  WorkoutRenderer: class {
    constructor(opts) {
      this.opts = opts;
      this.render = vi.fn();
      this.renderAll = vi.fn();
      this.remove = vi.fn();
      this.clear = vi.fn();
      mocks.renderers.push(this);
    }
  },
}));

vi.mock('../ui/ErrorBanner.js', () => ({
  ErrorBanner: class {
    constructor(opts) {
      this.opts = opts;
      this.show = vi.fn();
      this.hide = vi.fn();
      mocks.banners.push(this);
    }
  },
}));

import { App } from '../App.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';
import { WorkoutStorage } from '../storage/WorkoutStorage.js';

const RUNNING_FORM_DATA = {
  type: 'running',
  distance: 5,
  duration: 30,
  cadence: 170,
  elevation: 0,
  coords: [51.5, -0.09],
};

const CYCLING_FORM_DATA = {
  ...RUNNING_FORM_DATA,
  type: 'cycling',
  elevation: 200,
};

function buildDom() {
  document.body.innerHTML = `
    <button class="mobile-menu-btn" aria-controls="sidebar" aria-expanded="false"></button>
    <div class="sidebar" id="sidebar">
      <button class="sidebar__close-btn"></button>
      <div class="workout-summary" hidden>
        <span data-summary="count">0</span>
        <span data-summary="distance">0</span>
        <span data-summary="duration">0</span>
      </div>
      <div class="sidebar__actions" hidden>
        <button type="button" data-action="fit">Fit to markers</button>
        <button type="button" data-action="clear">Clear all</button>
      </div>
      <ul class="workouts">
        <li class="form__item"><form class="form hidden"></form></li>
        <li class="workouts__empty"></li>
      </ul>
      <a class="sidebar__link" href="https://example.com">Author</a>
    </div>
    <div id="map"></div>
  `;
}

const lastMap = () => mocks.maps.at(-1);
const lastForm = () => mocks.forms.at(-1);
const lastRenderer = () => mocks.renderers.at(-1);
const lastBanner = () => mocks.banners.at(-1);

// Lets the constructor's init().then()/.catch() chain settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('App', () => {
  beforeEach(() => {
    mocks.maps.length = 0;
    mocks.forms.length = 0;
    mocks.renderers.length = 0;
    mocks.banners.length = 0;
    mocks.initResult = null;
    localStorage.clear();
    buildDom();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('startup', () => {
    it('renders workouts loaded from storage', () => {
      const stored = new Running([1, 2], 5, 30, 170);
      WorkoutStorage.save([stored]);

      new App();

      const [rendered] = lastRenderer().renderAll.mock.calls[0];
      expect(rendered).toHaveLength(1);
      expect(rendered[0].id).toBe(stored.id);
    });

    it('marks the list as loading until the map is ready', async () => {
      new App();
      expect(
        document
          .querySelector('.workouts')
          .classList.contains('workouts--loading')
      ).toBe(true);

      await flush();
      expect(
        document
          .querySelector('.workouts')
          .classList.contains('workouts--loading')
      ).toBe(false);
    });

    it('renders stored markers once the map resolves', async () => {
      WorkoutStorage.save([new Running([1, 2], 5, 30, 170)]);

      new App();
      await flush();

      expect(lastMap().renderStoredMarkers).toHaveBeenCalledTimes(1);
    });

    it('shows the error banner when geolocation fails', async () => {
      mocks.initResult = Promise.reject(new Error('denied'));

      new App();
      await flush();

      expect(lastBanner().show).toHaveBeenCalledWith(
        expect.stringContaining('Could not get your position')
      );
    });

    it('keeps the list inert when geolocation fails', async () => {
      mocks.initResult = Promise.reject(new Error('denied'));

      new App();
      await flush();

      expect(
        document
          .querySelector('.workouts')
          .classList.contains('workouts--loading')
      ).toBe(true);
      expect(lastMap().renderStoredMarkers).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('creates a Running from running form data', () => {
      new App();
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);

      const [workout] = lastMap().renderMarker.mock.calls[0];
      expect(workout).toBeInstanceOf(Running);
      expect(workout.cadence).toBe(170);
    });

    it('creates a Cycling from cycling form data', () => {
      new App();
      lastForm().opts.onSubmit(CYCLING_FORM_DATA);

      const [workout] = lastMap().renderMarker.mock.calls[0];
      expect(workout).toBeInstanceOf(Cycling);
      expect(workout.elevation).toBe(200);
    });

    it('renders the new workout into the sidebar', () => {
      new App();
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);

      expect(lastRenderer().render).toHaveBeenCalledTimes(1);
    });

    it('persists the workout', () => {
      new App();
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);

      expect(WorkoutStorage.load()).toHaveLength(1);
    });

    it('reports an unknown workout type instead of storing undefined', () => {
      new App();
      lastForm().opts.onSubmit({ ...RUNNING_FORM_DATA, type: 'swimming' });

      expect(lastBanner().show).toHaveBeenCalledWith(
        expect.stringContaining('swimming')
      );
      expect(lastMap().renderMarker).not.toHaveBeenCalled();
      expect(WorkoutStorage.load()).toHaveLength(0);
    });

    it('warns when the workout could not be persisted', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      new App();
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);

      expect(lastBanner().show).toHaveBeenCalledWith(
        expect.stringContaining('could not be saved')
      );
      // The workout still reaches the map and the sidebar.
      expect(lastMap().renderMarker).toHaveBeenCalledTimes(1);
      expect(lastRenderer().render).toHaveBeenCalledTimes(1);
    });

    it('forwards validation errors to the banner', () => {
      new App();
      lastForm().opts.onValidationError('Inputs must be positive numbers!');

      expect(lastBanner().show).toHaveBeenCalledWith(
        'Inputs must be positive numbers!'
      );
    });
  });

  describe('workout selection', () => {
    it('moves the map to the clicked workout', () => {
      new App();
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);
      const [created] = lastMap().renderMarker.mock.calls[0];

      lastRenderer().opts.onWorkoutClick(created.id);

      expect(lastMap().moveToWorkout).toHaveBeenCalledWith(created);
    });

    it('ignores a click for an id it does not know', () => {
      new App();
      lastRenderer().opts.onWorkoutClick('does-not-exist');

      expect(lastMap().moveToWorkout).not.toHaveBeenCalled();
    });
  });

  describe('deleting a workout', () => {
    const addWorkout = () => {
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);
      return lastMap().renderMarker.mock.calls.at(-1)[0];
    };

    it('removes the marker, the card and the stored entry', () => {
      new App();
      const created = addWorkout();
      expect(WorkoutStorage.load()).toHaveLength(1);

      lastRenderer().opts.onWorkoutDelete(created.id);

      expect(lastMap().removeMarker).toHaveBeenCalledWith(created.id);
      expect(lastRenderer().remove).toHaveBeenCalledWith(created.id);
      expect(WorkoutStorage.load()).toHaveLength(0);
    });

    it('deletes only the requested workout', () => {
      new App();
      const first = addWorkout();
      const second = addWorkout();

      lastRenderer().opts.onWorkoutDelete(first.id);

      const remaining = WorkoutStorage.load();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(second.id);
    });

    it('ignores an unknown id', () => {
      new App();
      addWorkout();

      lastRenderer().opts.onWorkoutDelete('nope');

      expect(lastMap().removeMarker).not.toHaveBeenCalled();
      expect(WorkoutStorage.load()).toHaveLength(1);
    });

    it('warns when the deletion could not be persisted', () => {
      new App();
      const created = addWorkout();

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      lastRenderer().opts.onWorkoutDelete(created.id);

      expect(lastBanner().show).toHaveBeenCalledWith(
        expect.stringContaining('could not be saved')
      );
    });
  });

  describe('map click', () => {
    it('opens the form at the clicked position', () => {
      new App();
      const mapEvent = { latlng: { lat: 1, lng: 2 } };

      lastMap().opts.onMapClick(mapEvent);

      expect(lastForm().show).toHaveBeenCalledWith(mapEvent);
    });

    it('opens the sidebar on narrow viewports', () => {
      vi.stubGlobal('innerWidth', 500);
      new App();

      lastMap().opts.onMapClick({ latlng: { lat: 1, lng: 2 } });

      expect(
        document.querySelector('.sidebar').classList.contains('sidebar--open')
      ).toBe(true);
    });

    it('leaves the sidebar alone on wide viewports', () => {
      vi.stubGlobal('innerWidth', 1200);
      new App();

      lastMap().opts.onMapClick({ latlng: { lat: 1, lng: 2 } });

      expect(
        document.querySelector('.sidebar').classList.contains('sidebar--open')
      ).toBe(false);
    });
  });

  describe('mobile navigation', () => {
    it('opens the sidebar from the hamburger button', () => {
      new App();
      document.querySelector('.mobile-menu-btn').click();

      expect(
        document.querySelector('.sidebar').classList.contains('sidebar--open')
      ).toBe(true);
    });

    it('closes the sidebar from the close button', () => {
      new App();
      document.querySelector('.mobile-menu-btn').click();
      document.querySelector('.sidebar__close-btn').click();

      expect(
        document.querySelector('.sidebar').classList.contains('sidebar--open')
      ).toBe(false);
    });

    it('reflects open state on the hamburger button', () => {
      new App();
      const menuBtn = document.querySelector('.mobile-menu-btn');

      menuBtn.click();
      expect(menuBtn.getAttribute('aria-expanded')).toBe('true');

      document.querySelector('.sidebar__close-btn').click();
      expect(menuBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('moves focus into the overlay on open and back on close', () => {
      new App();
      const menuBtn = document.querySelector('.mobile-menu-btn');

      menuBtn.click();
      expect(document.activeElement).toBe(
        document.querySelector('.sidebar__close-btn')
      );

      document.querySelector('.sidebar__close-btn').click();
      expect(document.activeElement).toBe(menuBtn);
    });

    it('makes the map inert while the overlay is open', () => {
      new App();
      const mapEl = document.querySelector('#map');

      document.querySelector('.mobile-menu-btn').click();
      expect(mapEl.hasAttribute('inert')).toBe(true);

      document.querySelector('.sidebar__close-btn').click();
      expect(mapEl.hasAttribute('inert')).toBe(false);
    });

    it('closes the overlay on Escape', () => {
      new App();
      const sidebar = document.querySelector('.sidebar');
      document.querySelector('.mobile-menu-btn').click();

      sidebar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );

      expect(sidebar.classList.contains('sidebar--open')).toBe(false);
    });

    it('traps Tab inside the open overlay', () => {
      new App();
      const sidebar = document.querySelector('.sidebar');
      document.querySelector('.mobile-menu-btn').click();

      const focusable = Array.from(
        sidebar.querySelectorAll('a[href], button:not([disabled])')
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      last.focus();
      const forward = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      sidebar.dispatchEvent(forward);
      expect(document.activeElement).toBe(first);
      expect(forward.defaultPrevented).toBe(true);

      const backward = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      sidebar.dispatchEvent(backward);
      expect(document.activeElement).toBe(last);
      expect(backward.defaultPrevented).toBe(true);
    });

    it('ignores Escape when the overlay is already closed', () => {
      new App();
      const sidebar = document.querySelector('.sidebar');

      sidebar.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );

      expect(sidebar.classList.contains('sidebar--open')).toBe(false);
      expect(document.querySelector('#map').hasAttribute('inert')).toBe(false);
    });

    it('closes the sidebar after selecting a workout on mobile', () => {
      vi.stubGlobal('innerWidth', 500);
      const app = new App();
      void app;
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);
      const [created] = lastMap().renderMarker.mock.calls[0];

      document.querySelector('.mobile-menu-btn').click();
      lastRenderer().opts.onWorkoutClick(created.id);

      expect(
        document.querySelector('.sidebar').classList.contains('sidebar--open')
      ).toBe(false);
    });
  });

  describe('sidebar controls', () => {
    const addWorkout = () => {
      lastForm().opts.onSubmit(RUNNING_FORM_DATA);
      return lastMap().renderMarker.mock.calls.at(-1)[0];
    };
    const actionsEl = () => document.querySelector('.sidebar__actions');
    const clearBtn = () => document.querySelector('[data-action="clear"]');

    it('hides the summary and actions with no workouts', () => {
      new App();
      expect(actionsEl().hidden).toBe(true);
      expect(document.querySelector('.workout-summary').hidden).toBe(true);
    });

    it('reveals them once a workout exists', () => {
      new App();
      addWorkout();
      expect(actionsEl().hidden).toBe(false);
      expect(document.querySelector('.workout-summary').hidden).toBe(false);
      expect(document.querySelector('[data-summary="count"]').textContent).toBe(
        '1'
      );
    });

    it('fit button asks the map to fit every marker', () => {
      new App();
      addWorkout();
      document.querySelector('[data-action="fit"]').click();
      expect(lastMap().fitToWorkouts).toHaveBeenCalledTimes(1);
    });

    it('first clear click only arms the button', () => {
      new App();
      addWorkout();

      clearBtn().click();

      expect(clearBtn().textContent).toBe('Confirm clear?');
      expect(lastMap().removeAllMarkers).not.toHaveBeenCalled();
      expect(WorkoutStorage.load()).toHaveLength(1);
    });

    it('second clear click wipes workouts, markers and storage', () => {
      new App();
      addWorkout();

      clearBtn().click();
      clearBtn().click();

      expect(lastMap().removeAllMarkers).toHaveBeenCalledTimes(1);
      expect(lastRenderer().clear).toHaveBeenCalledTimes(1);
      expect(WorkoutStorage.load()).toHaveLength(0);
      expect(actionsEl().hidden).toBe(true);
    });

    it('the armed state lapses after the confirm window', () => {
      vi.useFakeTimers();
      new App();
      addWorkout();

      clearBtn().click();
      vi.advanceTimersByTime(App.CLEAR_CONFIRM_MS);
      expect(clearBtn().textContent).toBe('Clear all');

      // A later click re-arms rather than clearing.
      clearBtn().click();
      expect(WorkoutStorage.load()).toHaveLength(1);
      vi.useRealTimers();
    });

    it('adding a workout disarms a pending clear', () => {
      new App();
      addWorkout();
      clearBtn().click();

      addWorkout();

      expect(clearBtn().textContent).toBe('Clear all');
      expect(WorkoutStorage.load()).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('clears stored workouts and reloads', () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { reload });

      WorkoutStorage.save([new Running([1, 2], 5, 30, 170)]);
      localStorage.setItem('lastPosition', JSON.stringify([1, 2]));
      const app = new App();

      app.reset();

      expect(localStorage.getItem('workouts')).toBeNull();
      expect(localStorage.getItem('lastPosition')).toBeNull();
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});
