// Патерн Observer — суб'єкт (publisher).
// Сервіс операцій лише публікує подію «операцію створено / змінено / видалено»
// і нічого не знає про те, хто на неї реагує. Нові реакції підключаються підпискою,
// без зміни коду сервісу.
export class TransactionEventPublisher {
  #observers = [];

  // logger винесено в параметр, щоб у тестах можна було перевірити журналювання помилок
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  subscribe(observer) {
    if (typeof observer?.update !== 'function') {
      throw new TypeError('Спостерігач повинен мати метод update(event)');
    }
    if (!this.#observers.includes(observer)) this.#observers.push(observer);
    return () => this.unsubscribe(observer); // зручно для відписки в тестах
  }

  unsubscribe(observer) {
    this.#observers = this.#observers.filter((o) => o !== observer);
  }

  get observerCount() {
    return this.#observers.length;
  }

  // Сповіщає всіх спостерігачів. Викликається лише ПІСЛЯ успішного запису в БД.
  // Помилка одного спостерігача не зриває роботу інших і не скасовує вже виконану
  // операцію користувача — вона записується в журнал сервера.
  async notify(event) {
    const frozen = Object.freeze({ ...event, occurredAt: new Date().toISOString() });
    const results = await Promise.allSettled(this.#observers.map((o) => o.update(frozen)));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `[observer] ${this.#observers[i]?.constructor.name ?? 'observer'} не обробив подію "${event.action}":`,
          result.reason
        );
      }
    });
    return results;
  }
}
