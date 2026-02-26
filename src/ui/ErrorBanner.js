export class ErrorBanner {
  #el;
  #autoDismissTimer;

  constructor({ containerEl }) {
    this.#el = document.createElement('div');
    this.#el.className = 'error-banner error-banner--hidden';
    containerEl.prepend(this.#el);
  }

  show(message, { autoDismissMs = 4000 } = {}) {
    if (this.#autoDismissTimer) clearTimeout(this.#autoDismissTimer);
    this.#el.textContent = message;
    this.#el.classList.remove('error-banner--hidden');
    this.#autoDismissTimer = setTimeout(() => this.hide(), autoDismissMs);
  }

  hide() {
    this.#el.classList.add('error-banner--hidden');
  }
}
