import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

const WORKOUT_REGISTRY = {
  running: Running,
  cycling: Cycling,
};

export class WorkoutStorage {
  static save(workouts) {
    localStorage.setItem('workouts', JSON.stringify(workouts));
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
