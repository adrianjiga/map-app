import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBanner } from '../ui/ErrorBanner.js';

describe('ErrorBanner', () => {
  let containerEl;
  let banner;

  beforeEach(() => {
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
    banner = new ErrorBanner({ containerEl });
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
    vi.useRealTimers();
  });

  it('prepends a hidden banner element to containerEl', () => {
    const el = containerEl.querySelector('.error-banner');
    expect(el).not.toBeNull();
    expect(el.classList.contains('error-banner--hidden')).toBe(true);
  });

  it('show removes hidden class', () => {
    banner.show('Something went wrong');
    const el = containerEl.querySelector('.error-banner');
    expect(el.classList.contains('error-banner--hidden')).toBe(false);
  });

  it('show sets the text content', () => {
    banner.show('Test error message');
    const el = containerEl.querySelector('.error-banner__message');
    expect(el.textContent).toBe('Test error message');
  });

  it('is announced to assistive tech', () => {
    const el = containerEl.querySelector('.error-banner');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-live')).toBe('assertive');
  });

  it('exposes a labelled dismiss button that hides the banner', () => {
    banner.show('Test error message');
    const dismiss = containerEl.querySelector('.error-banner__dismiss');
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss error');

    dismiss.click();
    expect(
      containerEl
        .querySelector('.error-banner')
        .classList.contains('error-banner--hidden')
    ).toBe(true);
  });

  it('manual dismissal cancels the pending auto-dismiss timer', () => {
    vi.useFakeTimers();
    banner.show('Test', { autoDismissMs: 1000 });
    containerEl.querySelector('.error-banner__dismiss').click();

    banner.show('Second message', { autoDismissMs: 1000 });
    vi.advanceTimersByTime(600);
    // The first banner's timer must not have fired and hidden this one.
    expect(
      containerEl
        .querySelector('.error-banner')
        .classList.contains('error-banner--hidden')
    ).toBe(false);
  });

  it('auto-dismisses after the specified timeout', () => {
    vi.useFakeTimers();
    banner.show('Auto dismiss test', { autoDismissMs: 1000 });
    const el = containerEl.querySelector('.error-banner');
    expect(el.classList.contains('error-banner--hidden')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(el.classList.contains('error-banner--hidden')).toBe(true);
  });

  it('auto-dismisses after default 4000ms', () => {
    vi.useFakeTimers();
    banner.show('Default timeout');
    vi.advanceTimersByTime(3999);
    expect(
      containerEl
        .querySelector('.error-banner')
        .classList.contains('error-banner--hidden')
    ).toBe(false);
    vi.advanceTimersByTime(1);
    expect(
      containerEl
        .querySelector('.error-banner')
        .classList.contains('error-banner--hidden')
    ).toBe(true);
  });

  it('hide restores hidden class', () => {
    banner.show('Test');
    banner.hide();
    const el = containerEl.querySelector('.error-banner');
    expect(el.classList.contains('error-banner--hidden')).toBe(true);
  });

  it('calling show again resets the dismiss timer', () => {
    vi.useFakeTimers();
    banner.show('First', { autoDismissMs: 1000 });
    vi.advanceTimersByTime(500);
    banner.show('Second', { autoDismissMs: 1000 });
    vi.advanceTimersByTime(500);
    const el = containerEl.querySelector('.error-banner');
    expect(el.classList.contains('error-banner--hidden')).toBe(false);
    vi.advanceTimersByTime(500);
    expect(el.classList.contains('error-banner--hidden')).toBe(true);
  });
});
