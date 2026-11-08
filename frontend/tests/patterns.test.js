// Unit-тести ЛР № 12: патерн Strategy (експорт звіту) і допоміжні функції сторінки «Історія дій».
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CsvExportStrategy, ExcelExportStrategy, ExportStrategy, ReportExporter } from '../src/patterns/strategy/index.js';
import { changedFields, describeTransaction } from '../src/utils/audit.js';

const summary = {
  from: '2026-10-01',
  to: '2026-10-31',
  count: 3,
  totalIncome: 1500,
  totalExpense: 300.5,
  profit: 1199.5,
  byCategory: [
    { categoryId: 1, name: 'Продажі', type: 'income', total: 1500 },
    { categoryId: 3, name: 'Оренда & "офіс"', type: 'expense', total: 300.5 },
  ],
  byMonth: [{ month: '2026-10', income: 1500, expense: 300.5 }],
};

describe('Патерн Strategy: експорт звіту', () => {
  it('ST-01: CSV-стратегія зберігає формат, що був до рефакторингу', () => {
    const csv = new CsvExportStrategy().serialize(summary);
    assert.ok(csv.startsWith('\uFEFF'));
    const lines = csv.slice(1).split('\r\n');
    assert.equal(lines[0], '"Категорія";"Тип";"Сума, грн"');
    assert.equal(lines[2], '"Оренда & ""офіс""";"Витрата";"300.50"');
    assert.equal(lines.at(-1), '"Прибуток";"";"1199.50"');
  });

  it('ST-02: Excel-стратегія формує коректний XML із числовими сумами та двома аркушами', () => {
    const xml = new ExcelExportStrategy().serialize(summary);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.equal((xml.match(/<Worksheet /g) || []).length, 2);
    assert.ok(xml.includes('<Data ss:Type="Number">300.50</Data>'), 'сума — число, а не текст');
    assert.ok(xml.includes('Оренда &amp; &quot;офіс&quot;'), 'спецсимволи XML екрановано');
    assert.ok(!xml.includes('& "'), 'неекранованих символів немає');
  });

  it('ST-03: контекст ReportExporter змінює формат лише заміною стратегії', () => {
    const exporter = new ReportExporter(new CsvExportStrategy());
    const csv = exporter.createFile(summary);
    assert.equal(csv.filename, 'report_2026-10-01_2026-10-31.csv');
    assert.equal(csv.mimeType, 'text/csv;charset=utf-8');
    exporter.setStrategy(new ExcelExportStrategy());
    const xls = exporter.createFile(summary);
    assert.equal(xls.filename, 'report_2026-10-01_2026-10-31.xls');
    assert.equal(xls.mimeType, 'application/vnd.ms-excel');
  });

  it('ST-04: нову стратегію можна додати без змін контексту; некоректну — ні', () => {
    class JsonExportStrategy extends ExportStrategy {
      get label() { return 'JSON'; }
      get extension() { return 'json'; }
      get mimeType() { return 'application/json'; }
      serialize(s) { return JSON.stringify(s); }
    }
    const file = new ReportExporter(new JsonExportStrategy()).createFile(summary);
    assert.deepEqual(JSON.parse(file.content), summary);
    assert.throws(() => new ReportExporter({ serialize: () => '' }), TypeError);
    assert.throws(() => new ExportStrategy().serialize(summary), /serialize/);
  });
});

describe('Історія дій: відображення змін', () => {
  const before = { type: 'expense', categoryName: 'Оренда', amount: 100, date: '2026-10-01', description: 'X' };

  it('HI-01: changedFields показує лише змінені поля у форматі «було → стало»', () => {
    const changes = changedFields(before, { ...before, amount: 999, description: '' });
    assert.deepEqual(changes.map((c) => c.label), ['Сума', 'Опис']);
    assert.equal(changes[1].from, 'X');
    assert.equal(changes[1].to, '—');
    assert.deepEqual(changedFields(before, { ...before }), []);
    assert.deepEqual(changedFields(null, before), []);
  });

  it('HI-02: describeTransaction стисло описує операцію', () => {
    const text = describeTransaction(before);
    assert.ok(text.startsWith('Витрата, Оренда, '));
    assert.ok(text.includes('01.10.2026'));
    assert.ok(text.endsWith('— «X»'));
    assert.equal(describeTransaction(null), '—');
  });
});
