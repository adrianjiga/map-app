import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutRenderer } from '../renderer/WorkoutRenderer.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('WorkoutRenderer', () => {
  let containerEl;
  let onWorkoutClick;
  let renderer;

  beforeEach(() => {
    containerEl = document.createElement('ul');
    const formItemEl = document.createElement('li');
    formItemEl.className = 'form__item';
    const formEl = document.createElement('form');
    formEl.className = 'form hidden';
    formItemEl.appendChild(formEl);
    containerEl.appendChild(formItemEl);
    document.body.appendChild(containerEl);
    onWorkoutClick = vi.fn();
    renderer = new WorkoutRenderer({ containerEl, onWorkoutClick });
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('inserts <li> with the correct data-id', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const li = containerEl.querySelector('.workout');
    expect(li).not.toBeNull();
    expect(li.dataset.id).toBe(r.id);
  });

  it('rendered HTML includes workout emoji', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    expect(containerEl.innerHTML).toContain(r.emoji);
  });

  it('Running output contains min/km unit', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    expect(containerEl.innerHTML).toContain('min/km');
  });

  it('Cycling output contains km/h unit', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    renderer.render(c);
    expect(containerEl.innerHTML).toContain('km/h');
  });

  it('inserts workouts as siblings of the form item, not inside it', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const formItem = containerEl.querySelector('.form__item');
    expect(formItem.querySelector('.workout')).toBeNull();

    const children = Array.from(containerEl.children);
    expect(children.indexOf(containerEl.querySelector('.workout'))).toBe(
      children.indexOf(formItem) + 1
    );
  });

  it('renderAll renders all workouts', () => {
    const r = new Running([0, 0], 5, 30, 160);
    const c = new Cycling([1, 1], 20, 60, 500);
    renderer.renderAll([r, c]);
    expect(containerEl.querySelectorAll('.workout')).toHaveLength(2);
  });

  it('click on workout item fires onWorkoutClick with id', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const li = containerEl.querySelector('.workout');
    li.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onWorkoutClick).toHaveBeenCalledWith(r.id);
  });

  it('click on non-workout area does not fire onWorkoutClick', () => {
    renderer.render(new Running([0, 0], 5, 30, 160));
    const form = containerEl.querySelector('.form');
    form.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onWorkoutClick).not.toHaveBeenCalled();
  });

  it('Running output does not contain km/h (no type-switching leak)', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    expect(containerEl.innerHTML).not.toContain('km/h');
  });

  it('Cycling output does not contain min/km (no type-switching leak)', () => {
    const c = new Cycling([0, 0], 20, 60, 500);
    renderer.render(c);
    expect(containerEl.innerHTML).not.toContain('min/km');
  });
});
