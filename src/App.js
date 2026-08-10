import { MapService } from './map/MapService.js';
import { WorkoutFormController } from './form/WorkoutFormController.js';
import { WorkoutRenderer } from './renderer/WorkoutRenderer.js';
import { WorkoutStorage } from './storage/WorkoutStorage.js';
import {
  serializeWorkouts,
  parseWorkouts,
  exportFilename,
} from './storage/WorkoutTransfer.js';
import { ErrorBanner } from './ui/ErrorBanner.js';
import { WorkoutSummary } from './ui/WorkoutSummary.js';
import { WORKOUT_REGISTRY } from './workouts/index.js';
import {
  selectWorkouts,
  DEFAULT_SORT,
  DEFAULT_FILTER,
} from './workouts/ordering.js';
import { UNIT_SYSTEMS, DEFAULT_UNITS } from './units/units.js';

export class App {
  // How long the "Clear all" button stays armed before reverting.
  static CLEAR_CONFIRM_MS = 5000;

  #workouts = [];
  #mapService;
  #formController;
  #renderer;
  #errorBanner;
  #summary;
  #sidebarEl;
  #actionsEl;
  #controlsEl;
  #clearBtnEl;
  #clearConfirmTimer;
  #sort = DEFAULT_SORT;
  #filter = DEFAULT_FILTER;
  #units = DEFAULT_UNITS;
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
      onWorkoutEdit: this.#handleWorkoutEdit.bind(this),
    });

    this.#units = App.#loadUnits();

    this.#formController = new WorkoutFormController({
      containerEl: workoutsEl,
      units: this.#units,
      onSubmit: this.#handleFormSubmit.bind(this),
      onValidationError: (msg) => this.#errorBanner.show(msg),
    });

    this.#mapService = new MapService({
      onMapClick: (mapEvent) => {
        this.#formController.show(mapEvent);
        if (window.innerWidth <= 768) this.#openSidebar();
      },
    });

    this.#summary = new WorkoutSummary({
      containerEl: document.querySelector('.workout-summary'),
    });

    this.#initMobileNav();
    this.#initViewControls();
    this.#initSidebarActions();

    this.#workouts = WorkoutStorage.load();
    this.#refreshSidebar();

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

    if (data.editingId) {
      this.#applyEdit(data.editingId, Cls.fromFormData(data));
      return;
    }

    const workout = Cls.fromFormData(data);

    this.#workouts.push(workout);
    this.#mapService.renderMarker(workout);
    this.#refreshSidebar();

    this.#persist(
      'Workout added to the map but could not be saved — it will be lost on reload.'
    );
  }

  #handleWorkoutEdit(workoutId) {
    const workout = this.#workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    this.#formController.showForEdit(workout);
  }

  /**
   * Swaps the stored workout for a freshly constructed one, keeping the
   * original id and date so the card keeps its identity and place in the list.
   * Building a new instance rather than mutating is what makes changing the
   * type (running <-> cycling) work: pace/speed and the popup class come from
   * the class, not from the object's current fields.
   */
  #applyEdit(workoutId, replacement) {
    const index = this.#workouts.findIndex((w) => w.id === workoutId);
    if (index === -1) return;

    const original = this.#workouts[index];
    replacement.id = original.id;
    replacement.date = original.date;
    replacement._setDescription();

    this.#workouts[index] = replacement;
    this.#mapService.removeMarker(workoutId);
    this.#mapService.renderMarker(replacement);
    this.#refreshSidebar();
    this.#persist();
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
    this.#refreshSidebar();
    this.#persist();
  }

  static UNITS_KEY = 'units';

  static #loadUnits() {
    try {
      const stored = localStorage.getItem(App.UNITS_KEY);
      return stored in UNIT_SYSTEMS ? stored : DEFAULT_UNITS;
    } catch {
      return DEFAULT_UNITS;
    }
  }

  #initViewControls() {
    this.#controlsEl = document.querySelector('.workout-controls');

    const unitsEl = document.querySelector('[data-control="units"]');
    if (unitsEl) {
      unitsEl.value = this.#units;
      unitsEl.addEventListener('change', (e) => this.#setUnits(e.target.value));
    }

    document
      .querySelector('[data-control="filter"]')
      ?.addEventListener('change', (e) => {
        this.#filter = e.target.value;
        this.#refreshSidebar();
      });
    document
      .querySelector('[data-control="sort"]')
      ?.addEventListener('change', (e) => {
        this.#sort = e.target.value;
        this.#refreshSidebar();
      });
  }

  #initSidebarActions() {
    this.#actionsEl = document.querySelector('.sidebar__actions');
    this.#clearBtnEl = document.querySelector('[data-action="clear"]');

    document
      .querySelector('[data-action="fit"]')
      ?.addEventListener('click', () => this.#mapService.fitToWorkouts());
    this.#clearBtnEl?.addEventListener('click', () => this.#handleClearAll());

    document
      .querySelector('[data-action="export"]')
      ?.addEventListener('click', () => this.#exportWorkouts());

    const importInputEl = document.querySelector('#workout-import');
    document
      .querySelector('[data-action="import"]')
      ?.addEventListener('click', () => importInputEl?.click());
    importInputEl?.addEventListener('change', (e) =>
      this.#importFromFile(e.target)
    );
  }

  #exportWorkouts() {
    if (this.#workouts.length === 0) {
      this.#errorBanner.show('There are no workouts to export yet.');
      return;
    }

    const blob = new Blob([serializeWorkouts(this.#workouts)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename();
    link.click();
    URL.revokeObjectURL(url);
  }

  async #importFromFile(inputEl) {
    const file = inputEl.files?.[0];
    if (!file) return;
    // Reset first, so re-picking the same file still fires a change event.
    inputEl.value = '';

    let text;
    try {
      text = await file.text();
    } catch {
      this.#errorBanner.show('That file could not be read.');
      return;
    }

    this.#importWorkouts(text);
  }

  /**
   * Imports are additive and keyed by id: restoring a backup into an empty app
   * reproduces it exactly, and importing the same file twice is a no-op rather
   * than a duplicate. Nothing is ever deleted by an import.
   */
  #importWorkouts(text) {
    const { workouts, skipped, error } = parseWorkouts(text);
    if (error) {
      this.#errorBanner.show(error);
      return;
    }

    const known = new Set(this.#workouts.map((workout) => workout.id));
    const added = workouts.filter((workout) => !known.has(workout.id));

    added.forEach((workout) => {
      this.#workouts.push(workout);
      this.#mapService.renderMarker(workout);
    });

    this.#refreshSidebar();
    if (added.length > 0) this.#persist();

    this.#errorBanner.show(
      App.#importSummary(added.length, workouts.length, skipped)
    );
  }

  static #importSummary(added, valid, skipped) {
    if (added === 0 && valid === 0 && skipped === 0) {
      return 'That export contained no workouts.';
    }

    const parts = [`Imported ${added} workout${added === 1 ? '' : 's'}`];
    const duplicates = valid - added;
    if (duplicates > 0) parts.push(`${duplicates} already present`);
    if (skipped > 0) parts.push(`${skipped} unreadable`);
    return `${parts.join(', ')}.`;
  }

  #setUnits(unitsKey) {
    this.#units = unitsKey in UNIT_SYSTEMS ? unitsKey : DEFAULT_UNITS;
    this.#formController.setUnits(this.#units);
    try {
      localStorage.setItem(App.UNITS_KEY, this.#units);
    } catch {
      // A rejected preference write is not worth interrupting the user for.
    }
    this.#refreshSidebar();
  }

  // Single re-render path: the list, the markers on the map, the summary and
  // the control visibility all derive from the same filtered/sorted selection.
  #refreshSidebar() {
    const visible = selectWorkouts(this.#workouts, {
      sort: this.#sort,
      filter: this.#filter,
    });

    this.#renderer.renderAll(visible, {
      emptyMessage: this.#emptyMessage(),
      units: this.#units,
    });
    this.#mapService.showOnlyMarkers(visible.map((workout) => workout.id));
    this.#summary.render(visible, this.#units);

    const isEmpty = this.#workouts.length === 0;
    if (this.#actionsEl) this.#actionsEl.hidden = isEmpty;
    if (this.#controlsEl) this.#controlsEl.hidden = isEmpty;
    if (this.#clearConfirmTimer) this.#disarmClear();
  }

  #emptyMessage() {
    if (this.#workouts.length === 0) return undefined;
    return this.#filter === DEFAULT_FILTER
      ? undefined
      : `No ${this.#filter} workouts yet. Change the filter to see the others.`;
  }

  // A two-step button rather than confirm(): native dialogs are banned here,
  // and a real modal would need its own focus management to stay accessible.
  #handleClearAll() {
    if (!this.#clearConfirmTimer) {
      this.#armClear();
      return;
    }
    this.#disarmClear();
    this.#clearAllWorkouts();
  }

  #armClear() {
    if (!this.#clearBtnEl) return;
    this.#clearBtnEl.textContent = 'Confirm clear?';
    this.#clearBtnEl.classList.add('sidebar__action--armed');
    this.#clearConfirmTimer = setTimeout(
      () => this.#disarmClear(),
      App.CLEAR_CONFIRM_MS
    );
  }

  #disarmClear() {
    clearTimeout(this.#clearConfirmTimer);
    this.#clearConfirmTimer = undefined;
    if (!this.#clearBtnEl) return;
    this.#clearBtnEl.textContent = 'Clear all';
    this.#clearBtnEl.classList.remove('sidebar__action--armed');
  }

  #clearAllWorkouts() {
    this.#workouts = [];
    this.#mapService.removeAllMarkers();
    this.#refreshSidebar();
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
    localStorage.removeItem('lastPosition');
    localStorage.removeItem(App.UNITS_KEY);
    location.reload();
  }
}
