import { MapService } from './map/MapService.js';
import { WorkoutFormController } from './form/WorkoutFormController.js';
import { WorkoutRenderer } from './renderer/WorkoutRenderer.js';
import { WorkoutStorage } from './storage/WorkoutStorage.js';
import { ErrorBanner } from './ui/ErrorBanner.js';
import { Running, Cycling } from './workouts/index.js';

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

    this.#mapService
      .init()
      .then(() => {
        this.#mapService.renderStoredMarkers(this.#workouts);
      })
      .catch(() => {
        this.#errorBanner.show(
          'Could not get your position! Please try again.'
        );
      });
  }

  #handleFormSubmit({ type, distance, duration, cadence, elevation, coords }) {
    let workout;

    if (type === 'running') {
      workout = new Running(coords, distance, duration, cadence);
    } else if (type === 'cycling') {
      workout = new Cycling(coords, distance, duration, elevation);
    }

    this.#workouts.push(workout);
    this.#mapService.renderMarker(workout);
    this.#renderer.render(workout);
    WorkoutStorage.save(this.#workouts);
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
