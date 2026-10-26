// Регресійні unit-тести допоміжних функцій frontend (виправлені дефекти D-02 і D-04).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fillMonths, monthsBetween } from '../src/utils/format.js';
import { parseAmount, validateTransaction } from '../src/utils/validators.js';

const base = { type: 'expense', categoryId: '3', amount: '100', date: '2024-05-01', description: '' };

describe('Регресійні тести frontend', () => {
  it('RT-01: monthsBetween перелічує місяці, зокрема на межі років', () => {
    assert.deepEqual(monthsBetween('2025-11-15', '2026-02-03'), ['2025-11', '2025-12', '2026-01', '2026-02']);
    assert.deepEqual(monthsBetween('2026-05-01', '2026-05-31'), ['2026-05']);
  });

  it('RT-02: fillMonths додає нулі для місяців без операцій (дефект D-02)', () => {
    const data = [{ month: '2020-01', income: 10, expense: 0 }, { month: '2020-03', income: 5, expense: 2 }];
    assert.deepEqual(fillMonths(data, '2020-01-01', '2020-03-31'), [
      { month: '2020-01', income: 10, expense: 0 },
      { month: '2020-02', income: 0, expense: 0 },
      { month: '2020-03', income: 5, expense: 2 },
    ]);
  });

  it('RT-03: перевірка суми на клієнті, включно з верхньою межею (дефект D-04)', () => {
    assert.equal(validateTransaction(base).amount, undefined);
    assert.equal(validateTransaction({ ...base, amount: '1 250,50' }).amount, undefined);
    assert.ok(validateTransaction({ ...base, amount: '0' }).amount);
    assert.ok(validateTransaction({ ...base, amount: '10.123' }).amount);
    assert.equal(validateTransaction({ ...base, amount: '12345678901' }).amount, 'Сума занадто велика');
    assert.equal(parseAmount('1 250,50'), 1250.5);
  });
});
