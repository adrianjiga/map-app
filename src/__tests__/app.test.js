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
      this.moveToWorkout = vi.fn();
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
      <ul class="workouts">
        <li class="form__item"><form class="form hidden"></form></li>
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

  describe('reset', () => {
    it('clears stored workouts and reloads', () => {
      const reload = vi.fn();
      vi.stubGlobal('location', { reload });

      WorkoutStorage.save([new Running([1, 2], 5, 30, 170)]);
      const app = new App();

      app.reset();

      expect(localStorage.getItem('workouts')).toBeNull();
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });
});
