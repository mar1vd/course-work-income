// Патерн Strategy — спільний інтерфейс алгоритму експорту звіту.
// Кожна стратегія знає лише, як перетворити підсумки звіту (відповідь GET /reports/summary)
// на вміст файла свого формату. Як файл потім потрапить користувачу — не її справа.
export class ExportStrategy {
  /** Підпис для кнопки, наприклад «CSV» */
  get label() {
    throw new Error(`${this.constructor.name}: не визначено label`);
  }

  /** Розширення файла без крапки */
  get extension() {
    throw new Error(`${this.constructor.name}: не визначено extension`);
  }

  /** MIME-тип вмісту */
  get mimeType() {
    throw new Error(`${this.constructor.name}: не визначено mimeType`);
  }

  /**
   * @param {object} summary — { from, to, count, totalIncome, totalExpense, profit, byCategory[], byMonth[] }
   * @returns {string} вміст файла
   */
  // eslint-disable-next-line no-unused-vars
  serialize(summary) {
    throw new Error(`${this.constructor.name} має реалізувати serialize(summary)`);
  }
}

export { TYPE_LABELS } from '../../utils/format.js';
