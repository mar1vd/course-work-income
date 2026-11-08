// Стратегія CSV: той самий формат, що був у ReportsPage до рефакторингу
// (роздільник «;», UTF-8 з BOM, щоб Excel коректно відкривав кирилицю).
import { ExportStrategy, TYPE_LABELS } from './ExportStrategy.js';

const quote = (cell) => `"${String(cell).replace(/"/g, '""')}"`;

export class CsvExportStrategy extends ExportStrategy {
  get label() {
    return 'CSV';
  }
  get extension() {
    return 'csv';
  }
  get mimeType() {
    return 'text/csv;charset=utf-8';
  }

  serialize(summary) {
    const rows = [['Категорія', 'Тип', 'Сума, грн']];
    summary.byCategory.forEach((c) => rows.push([c.name, TYPE_LABELS[c.type], c.total.toFixed(2)]));
    rows.push(
      [],
      ['Доходи', '', summary.totalIncome.toFixed(2)],
      ['Витрати', '', summary.totalExpense.toFixed(2)],
      ['Прибуток', '', summary.profit.toFixed(2)]
    );
    return '\uFEFF' + rows.map((r) => r.map(quote).join(';')).join('\r\n');
  }
}
