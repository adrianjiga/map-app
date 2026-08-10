import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutRenderer } from '../renderer/WorkoutRenderer.js';
import { Running } from '../workouts/Running.js';
import { Cycling } from '../workouts/Cycling.js';

describe('WorkoutRenderer', () => {
  let containerEl;
  let onWorkoutClick;
  let onWorkoutDelete;
  let renderer;

  beforeEach(() => {
    containerEl = document.createElement('ul');
    const formItemEl = document.createElement('li');
    formItemEl.className = 'form__item';
    const formEl = document.createElement('form');
    formEl.className = 'form hidden';
    formItemEl.appendChild(formEl);
    containerEl.appendChild(formItemEl);
    const emptyEl = document.createElement('li');
    emptyEl.className = 'workouts__empty';
    containerEl.appendChild(emptyEl);
    document.body.appendChild(containerEl);
    onWorkoutClick = vi.fn();
    onWorkoutDelete = vi.fn();
    renderer = new WorkoutRenderer({
      containerEl,
      onWorkoutClick,
      onWorkoutDelete,
    });
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

  it('wraps card contents in a real button for keyboard users', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const button = containerEl.querySelector('.workout .workout__select');
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
  });

  it('keyboard activation of the card fires onWorkoutClick', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    // click() is what Enter/Space dispatch on a native button.
    containerEl.querySelector('.workout__select').click();
    expect(onWorkoutClick).toHaveBeenCalledWith(r.id);
  });

  it('hides decorative icons and the type badge from assistive tech', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const badge = containerEl.querySelector('.workout__type-badge');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    containerEl.querySelectorAll('.workout__icon').forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('contains only phrasing content inside the button', () => {
    renderer.render(new Running([0, 0], 5, 30, 160));
    const button = containerEl.querySelector('.workout__select');
    const invalid = button.querySelectorAll('div, h1, h2, h3, h4, h5, h6, ul');
    expect(invalid).toHaveLength(0);
  });

  it('escapes workout text instead of interpolating it into HTML', () => {
    const r = new Running([0, 0], 5, 30, 160);
    r.description = '<img src=x onerror="alert(1)">';
    renderer.render(r);

    const title = containerEl.querySelector('.workout__title');
    expect(title.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(title.querySelector('img')).toBeNull();
    expect(containerEl.querySelector('img')).toBeNull();
  });

  it('renders a labelled delete button per card', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    const deleteBtn = containerEl.querySelector('.workout__delete');
    expect(deleteBtn.tagName).toBe('BUTTON');
    expect(deleteBtn.getAttribute('aria-label')).toBe(
      `Delete ${r.description}`
    );
  });

  it('delete button fires onWorkoutDelete, not onWorkoutClick', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);

    containerEl.querySelector('.workout__delete').click();

    expect(onWorkoutDelete).toHaveBeenCalledWith(r.id);
    expect(onWorkoutClick).not.toHaveBeenCalled();
  });

  it('the delete button is not nested inside the select button', () => {
    renderer.render(new Running([0, 0], 5, 30, 160));
    const selectBtn = containerEl.querySelector('.workout__select');
    expect(selectBtn.querySelector('.workout__delete')).toBeNull();
  });

  it('remove deletes only the matching card', () => {
    const r = new Running([0, 0], 5, 30, 160);
    const c = new Cycling([1, 1], 20, 60, 500);
    renderer.renderAll([r, c]);

    renderer.remove(r.id);

    const remaining = containerEl.querySelectorAll('.workout');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].dataset.id).toBe(c.id);
  });

  it('remove ignores an unknown id', () => {
    renderer.render(new Running([0, 0], 5, 30, 160));
    renderer.remove('nope');
    expect(containerEl.querySelectorAll('.workout')).toHaveLength(1);
  });

  it('clear removes every card but keeps the form', () => {
    renderer.renderAll([
      new Running([0, 0], 5, 30, 160),
      new Cycling([1, 1], 20, 60, 500),
    ]);

    renderer.clear();

    expect(containerEl.querySelectorAll('.workout')).toHaveLength(0);
    expect(containerEl.querySelector('.form')).not.toBeNull();
  });

  it('shows the empty state until a workout exists', () => {
    const emptyEl = containerEl.querySelector('.workouts__empty');
    renderer.renderAll([]);
    expect(emptyEl.hidden).toBe(false);

    renderer.render(new Running([0, 0], 5, 30, 160));
    expect(emptyEl.hidden).toBe(true);
  });

  it('restores the empty state after the last workout is removed', () => {
    const r = new Running([0, 0], 5, 30, 160);
    renderer.render(r);
    renderer.remove(r.id);
    expect(containerEl.querySelector('.workouts__empty').hidden).toBe(false);
  });

  it('restores the empty state after clear', () => {
    renderer.renderAll([
      new Running([0, 0], 5, 30, 160),
      new Cycling([1, 1], 20, 60, 500),
    ]);
    renderer.clear();
    expect(containerEl.querySelector('.workouts__empty').hidden).toBe(false);
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
