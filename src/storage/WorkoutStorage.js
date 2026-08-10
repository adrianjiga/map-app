import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

const WORKOUT_REGISTRY = {
  running: Running,
  cycling: Cycling,
};

export class WorkoutStorage {
  /**
   * Persists workouts to localStorage.
   * @returns {boolean} false if storage rejected the write (quota exceeded,
   *   Safari private mode) so the caller can tell the user their workout will
   *   not survive a reload.
   */
  static save(workouts) {
    try {
      localStorage.setItem('workouts', JSON.stringify(workouts));
      return true;
    } catch {
      return false;
    }
  }

  static load() {
    try {
      const data = JSON.parse(localStorage.getItem('workouts'));
      if (!data) return [];

      return data
        .map((obj) => {
          const Cls = WORKOUT_REGISTRY[obj.type];
          if (!Cls) return null;
          const instance = Object.create(Cls.prototype);
          Object.assign(instance, obj);
          instance.date = new Date(obj.date);
          return instance;
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
