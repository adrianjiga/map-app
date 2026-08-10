import { MapService } from './map/MapService.js';
import { WorkoutFormController } from './form/WorkoutFormController.js';
import { WorkoutRenderer } from './renderer/WorkoutRenderer.js';
import { WorkoutStorage } from './storage/WorkoutStorage.js';
import { ErrorBanner } from './ui/ErrorBanner.js';
import { WORKOUT_REGISTRY } from './workouts/index.js';

export class App {
  #workouts = [];
  #mapService;
  #formController;
  #renderer;
  #errorBanner;
  #sidebarEl;
  #menuBtnEl;
  #closeBtnEl;
  #mapEl;

  constructor() {
    this.#sidebarEl = document.querySelector('.sidebar');
    const workoutsEl = document.querySelector('.workouts');

    this.#errorBanner = new ErrorBanner({ containerEl: this.#sidebarEl });

    this.#renderer = new WorkoutRenderer({
      containerEl: workoutsEl,
      onWorkoutClick: this.#handleWorkoutClick.bind(this),
      onWorkoutDelete: this.#handleWorkoutDelete.bind(this),
    });

    this.#formController = new WorkoutFormController({
      containerEl: workoutsEl,
      onSubmit: this.#handleFormSubmit.bind(this),
      onValidationError: (msg) => this.#errorBanner.show(msg),
    });

    this.#mapService = new MapService({
      onMapClick: (mapEvent) => {
        this.#formController.show(mapEvent);
        if (window.innerWidth <= 768) this.#openSidebar();
      },
    });

    this.#initMobileNav();

    this.#workouts = WorkoutStorage.load();
    this.#renderer.renderAll(this.#workouts);

    // Cards render before geolocation resolves; keep them inert until there is
    // a map to pan.
    workoutsEl.classList.add('workouts--loading');

    this.#mapService
      .init()
      .then(() => {
        workoutsEl.classList.remove('workouts--loading');
        this.#mapService.renderStoredMarkers(this.#workouts);
      })
      .catch(() => {
        this.#errorBanner.show(
          'Could not get your position! Please try again.'
        );
      });
  }

  #handleFormSubmit(data) {
    const Cls = WORKOUT_REGISTRY[data.type];
    if (!Cls) {
      this.#errorBanner.show(`Unknown workout type: ${data.type}`);
      return;
    }

    const workout = Cls.fromFormData(data);

    this.#workouts.push(workout);
    this.#mapService.renderMarker(workout);
    this.#renderer.render(workout);

    this.#persist(
      'Workout added to the map but could not be saved — it will be lost on reload.'
    );
  }

  #persist(failureMessage = 'Changes could not be saved to this browser.') {
    if (!WorkoutStorage.save(this.#workouts)) {
      this.#errorBanner.show(failureMessage);
    }
  }

  #handleWorkoutDelete(workoutId) {
    const index = this.#workouts.findIndex((w) => w.id === workoutId);
    if (index === -1) return;

    this.#workouts.splice(index, 1);
    this.#mapService.removeMarker(workoutId);
    this.#renderer.remove(workoutId);
    this.#persist();
  }

  #handleWorkoutClick(workoutId) {
    const workout = this.#workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    this.#mapService.moveToWorkout(workout);
    if (window.innerWidth <= 768) this.#closeSidebar();
  }

  #initMobileNav() {
    this.#menuBtnEl = document.querySelector('.mobile-menu-btn');
    this.#closeBtnEl = document.querySelector('.sidebar__close-btn');
    this.#mapEl = document.querySelector('#map');

    this.#menuBtnEl?.addEventListener('click', () => this.#openSidebar());
    this.#closeBtnEl?.addEventListener('click', () => this.#closeSidebar());
    this.#sidebarEl.addEventListener('keydown', (e) =>
      this.#handleSidebarKeydown(e)
    );
  }

  get #isSidebarOpen() {
    return this.#sidebarEl.classList.contains('sidebar--open');
  }

  #openSidebar() {
    this.#sidebarEl.classList.add('sidebar--open');
    this.#menuBtnEl?.setAttribute('aria-expanded', 'true');
    // The overlay covers the map, so hide it from assistive tech too.
    this.#mapEl?.toggleAttribute('inert', true);
    this.#closeBtnEl?.focus();
  }

  #closeSidebar() {
    if (!this.#isSidebarOpen) return;
    this.#sidebarEl.classList.remove('sidebar--open');
    this.#menuBtnEl?.setAttribute('aria-expanded', 'false');
    this.#mapEl?.toggleAttribute('inert', false);
    this.#menuBtnEl?.focus();
  }

  #handleSidebarKeydown(e) {
    if (!this.#isSidebarOpen) return;

    if (e.key === 'Escape') {
      this.#closeSidebar();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = this.#focusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  #focusableElements() {
    return Array.from(
      this.#sidebarEl.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.closest('.hidden, .error-banner--hidden'));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
