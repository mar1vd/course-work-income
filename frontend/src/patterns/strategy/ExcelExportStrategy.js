// Стратегія Excel: книга у форматі SpreadsheetML (XML-формат Microsoft Excel, .xls).
// На відміну від CSV, суми зберігаються як числа з форматом «0,00», а не як текст,
// тому файл однаково відкривається в Excel з будь-якими регіональними налаштуваннями
// (зауваження з ЛР № 11 про локалі CSV). Окремий аркуш — динаміка по місяцях.
// Бібліотеки не потрібні: формат — звичайний XML.
import { ExportStrategy, TYPE_LABELS } from './ExportStrategy.js';

const escapeXml = (value) =>
  String(value).replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]);

const text = (value, style) =>
  `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
const money = (value, style = 'money') => `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number(value).toFixed(2)}</Data></Cell>`;
const row = (...cells) => `<Row>${cells.join('')}</Row>`;

function worksheet(name, widths, rows) {
  const columns = widths.map((w) => `<Column ss:Width="${w}"/>`).join('');
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${columns}${rows.join('')}</Table></Worksheet>`;
}

export class ExcelExportStrategy extends ExportStrategy {
  get label() {
    return 'Excel';
  }
  get extension() {
    return 'xls';
  }
  get mimeType() {
    return 'application/vnd.ms-excel';
  }

  serialize(summary) {
    const byCategory = worksheet('За категоріями', [180, 90, 110], [
      row(text(`Звіт за період ${summary.from} — ${summary.to}`, 'title')),
      row(),
      row(text('Категорія', 'head'), text('Тип', 'head'), text('Сума, грн', 'head')),
      ...summary.byCategory.map((c) => row(text(c.name), text(TYPE_LABELS[c.type]), money(c.total))),
      row(),
      row(text('Доходи', 'head'), text(''), money(summary.totalIncome, 'total')),
      row(text('Витрати', 'head'), text(''), money(summary.totalExpense, 'total')),
      row(text('Прибуток', 'head'), text(''), money(summary.profit, 'total')),
      row(text('Кількість операцій'), text(''), `<Cell><Data ss:Type="Number">${summary.count}</Data></Cell>`),
    ]);

    const byMonth = worksheet('По місяцях', [90, 110, 110], [
      row(text('Місяць', 'head'), text('Доходи, грн', 'head'), text('Витрати, грн', 'head')),
      ...summary.byMonth.map((m) => row(text(m.month), money(m.income), money(m.expense))),
    ]);

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      '<Styles>',
      '<Style ss:ID="title"><Font ss:Bold="1" ss:Size="13"/></Style>',
      '<Style ss:ID="head"><Font ss:Bold="1"/></Style>',
      '<Style ss:ID="money"><NumberFormat ss:Format="#,##0.00"/></Style>',
      '<Style ss:ID="total"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/></Style>',
      '</Styles>',
      byCategory,
      byMonth,
      '</Workbook>',
    ].join('\n');
  }
}
