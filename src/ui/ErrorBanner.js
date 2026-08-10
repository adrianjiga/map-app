export class ErrorBanner {
  #el;
  #messageEl;
  #autoDismissTimer;

  constructor({ containerEl }) {
    this.#el = document.createElement('div');
    this.#el.className = 'error-banner error-banner--hidden';
    // assertive: a validation or geolocation failure blocks what the user was
    // trying to do, so it should interrupt rather than wait for a pause.
    this.#el.setAttribute('role', 'alert');
    this.#el.setAttribute('aria-live', 'assertive');

    this.#messageEl = document.createElement('span');
    this.#messageEl.className = 'error-banner__message';

    const dismissEl = document.createElement('button');
    dismissEl.type = 'button';
    dismissEl.className = 'error-banner__dismiss';
    dismissEl.setAttribute('aria-label', 'Dismiss error');
    dismissEl.textContent = '✕';
    dismissEl.addEventListener('click', () => this.hide());

    this.#el.append(this.#messageEl, dismissEl);
    containerEl.prepend(this.#el);
  }

  show(message, { autoDismissMs = 4000 } = {}) {
    if (this.#autoDismissTimer) clearTimeout(this.#autoDismissTimer);
    this.#messageEl.textContent = message;
    this.#el.classList.remove('error-banner--hidden');
    this.#autoDismissTimer = setTimeout(() => this.hide(), autoDismissMs);
  }

  hide() {
    if (this.#autoDismissTimer) clearTimeout(this.#autoDismissTimer);
    this.#el.classList.add('error-banner--hidden');
  }
}
