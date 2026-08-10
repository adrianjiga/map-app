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

  constructor() {
    this.#sidebarEl = document.querySelector('.sidebar');
    const workoutsEl = document.querySelector('.workouts');

    this.#errorBanner = new ErrorBanner({ containerEl: this.#sidebarEl });

    this.#renderer = new WorkoutRenderer({
      containerEl: workoutsEl,
      onWorkoutClick: this.#handleWorkoutClick.bind(this),
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

    if (!WorkoutStorage.save(this.#workouts)) {
      this.#errorBanner.show(
        'Workout added to the map but could not be saved — it will be lost on reload.'
      );
    }
  }

  #handleWorkoutClick(workoutId) {
    const workout = this.#workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    this.#mapService.moveToWorkout(workout);
    if (window.innerWidth <= 768) this.#closeSidebar();
  }

  #initMobileNav() {
    document
      .querySelector('.mobile-menu-btn')
      ?.addEventListener('click', () => this.#openSidebar());
    document
      .querySelector('.sidebar__close-btn')
      ?.addEventListener('click', () => this.#closeSidebar());
  }

  #openSidebar() {
    this.#sidebarEl.classList.add('sidebar--open');
  }

  #closeSidebar() {
    this.#sidebarEl.classList.remove('sidebar--open');
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
