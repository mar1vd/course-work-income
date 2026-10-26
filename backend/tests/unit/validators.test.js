// Модульні (unit) тести функцій валідації з src/utils/validators.js.
// Перевіряється лише логіка функцій — без бази даних і HTTP.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../src/utils/ApiError.js';
import {
  isISODate,
  parseId,
  parsePagination,
  todayISO,
  validateCategory,
  validatePeriod,
  validateTransaction,
  validateUser,
} from '../../src/utils/validators.js';

// Допоміжна функція: очікуємо помилку 422 із повідомленням для вказаного поля
function assertInvalid(fn, field) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ApiError, 'очікувалась ApiError');
    assert.equal(error.status, 422);
    assert.ok(error.details[field], `немає помилки для поля "${field}"`);
    return true;
  });
}

const validTx = { type: 'expense', categoryId: 3, amount: 100.5, date: '2024-05-01', description: '  Оренда  ' };

describe('Модульні тести валідаторів', () => {
  it('UT-01: isISODate приймає коректні дати та відхиляє неіснуючі', () => {
    assert.equal(isISODate('2024-02-29'), true); // високосний рік
    assert.equal(isISODate('2024-02-30'), false);
    assert.equal(isISODate('2024-13-01'), false);
    assert.equal(isISODate('вчора'), false);
    assert.equal(isISODate(20240101), false);
  });

  it('UT-02: parseId повертає число для коректних ідентифікаторів', () => {
    assert.equal(parseId('5'), 5);
    assert.equal(parseId('2147483647'), 2147483647);
  });

  it('UT-03: parseId відхиляє некоректні ідентифікатори (HTTP 400)', () => {
    for (const bad of ['abc', '0', '-1', '1.5', '', '2147483648']) {
      assert.throws(() => parseId(bad), (e) => e instanceof ApiError && e.status === 400, `значення "${bad}"`);
    }
  });

  it('UT-04: parsePagination — значення за замовчуванням і обмеження', () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 10 });
    assert.deepEqual(parsePagination({ page: '3', limit: '25' }), { page: 3, limit: 25 });
    assert.deepEqual(parsePagination({ page: '-4', limit: '5000' }), { page: 1, limit: 100 });
    assert.deepEqual(parsePagination({ page: 'abc', limit: 'xyz' }), { page: 1, limit: 10 });
  });

  it('UT-05: validateTransaction повертає очищені дані для коректної операції', () => {
    const result = validateTransaction(validTx);
    assert.deepEqual(result, { type: 'expense', categoryId: 3, amount: 100.5, date: '2024-05-01', description: 'Оренда' });
  });

  it('UT-06: validateTransaction розуміє суму рядком із комою та відхиляє некоректні суми', () => {
    assert.equal(validateTransaction({ ...validTx, amount: '99,5' }).amount, 99.5);
    for (const amount of [0, -5, 10.123, 'abc', null, true]) {
      assertInvalid(() => validateTransaction({ ...validTx, amount }), 'amount');
    }
  });

  it('UT-07: validateTransaction — дата не з майбутнього (за часовим поясом підприємства)', () => {
    const tomorrow = todayISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
    assert.doesNotThrow(() => validateTransaction({ ...validTx, date: todayISO() }));
    assertInvalid(() => validateTransaction({ ...validTx, date: tomorrow }), 'date');
    assertInvalid(() => validateTransaction({ ...validTx, date: '2024-02-30' }), 'date');
  });

  it('UT-08: validateCategory обрізає пробіли та перевіряє довжину й тип', () => {
    assert.deepEqual(validateCategory({ name: '  Реклама ', type: 'expense' }), { name: 'Реклама', type: 'expense' });
    assertInvalid(() => validateCategory({ name: 'a', type: 'expense' }), 'name');
    assertInvalid(() => validateCategory({ name: 'x'.repeat(101), type: 'expense' }), 'name');
    assertInvalid(() => validateCategory({ name: 'Назва', type: 'other' }), 'type');
  });

  it('UT-09: validateUser — e-mail у нижньому регістрі, пароль обов\'язковий лише при створенні', () => {
    const body = { fullName: 'Іван Петренко', email: ' Ivan@Example.COM ', role: 'accountant', password: 'longpass1' };
    assert.equal(validateUser(body, true).email, 'ivan@example.com');
    assert.equal(validateUser({ ...body, password: undefined }, false).password, null);
    assertInvalid(() => validateUser({ ...body, password: undefined }, true), 'password');
    assertInvalid(() => validateUser({ ...body, password: '123' }, true), 'password');
    assertInvalid(() => validateUser({ ...body, role: 'boss' }, true), 'role');
  });

  it('UT-10: validatePeriod — значення за замовчуванням і перевірка меж', () => {
    assert.deepEqual(validatePeriod({}), { from: '1970-01-01', to: '9999-12-31' });
    assert.deepEqual(validatePeriod({ from: '2024-01-01', to: '2024-12-31' }), { from: '2024-01-01', to: '2024-12-31' });
    assertInvalid(() => validatePeriod({ from: '2024-05-01', to: '2024-04-01' }), 'from');
    assertInvalid(() => validatePeriod({ from: 'вчора' }), 'from');
  });
});
