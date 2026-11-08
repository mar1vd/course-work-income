// Патерн Observer — інтерфейс спостерігача.
// Спостерігач отримує подію про зміну фінансової операції. Конкретні спостерігачі
// (журнал дій, сповіщення, перерахунок кешу тощо) перевизначають метод update().
export class TransactionObserver {
  /**
   * @param {object} event
   * @param {'create'|'update'|'delete'} event.action — що сталося з операцією
   * @param {{id: number, fullName: string}} event.actor — хто виконав дію
   * @param {number} event.transactionId — ідентифікатор операції
   * @param {object|null} event.before — стан операції до дії (null для create)
   * @param {object|null} event.after — стан операції після дії (null для delete)
   */
  // eslint-disable-next-line no-unused-vars
  async update(event) {
    throw new Error(`${this.constructor.name} має реалізувати метод update(event)`);
  }
}
