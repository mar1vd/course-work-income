// Інтеграційні тести: взаємодія серверної частини (репозиторії) з реальною базою PostgreSQL.
// Використовується окрема тестова БД; таблиці перестворюються перед запуском.
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://finance:finance@localhost:5432/finance_test';

// Захист: тести не повинні торкатися робочої бази
const dbName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_test')) throw new Error(`Тести можна запускати лише на тестовій БД (_test), а не на "${dbName}"`);

const { migrate } = await import('../../src/db/migrate.js');
const { closePool, query } = await import('../../src/config/db.js');
const transactionRepository = await import('../../src/repositories/transaction.repository.js');
const categoryRepository = await import('../../src/repositories/category.repository.js');
const reportRepository = await import('../../src/repositories/report.repository.js');

let userId;
let incomeCategoryId;
let expenseCategoryId;

before(async () => {
  await migrate({ reset: true });
  const user = await query(`INSERT INTO users (full_name, email, password_hash, role) VALUES ('Тест', 't@test.com', 'hash', 'accountant') RETURNING id`);
  userId = user.rows[0].id;
  incomeCategoryId = (await categoryRepository.create({ name: 'Продажі', type: 'income' })).id;
  expenseCategoryId = (await categoryRepository.create({ name: 'Оренда', type: 'expense' })).id;
});

after(async () => {
  await closePool();
});

describe('Інтеграційне тестування: сервер ↔ база даних', () => {
  it('IT-001: операція зберігається в БД і читається за ідентифікатором', async () => {
    const created = await transactionRepository.create(userId, {
      type: 'expense', categoryId: expenseCategoryId, amount: 1250.5, date: '2024-06-15', description: 'Оренда за червень',
    });
    // Читання через репозиторій
    const loaded = await transactionRepository.findById(created.id);
    assert.deepEqual(loaded, {
      id: created.id, userId, categoryId: expenseCategoryId, categoryName: 'Оренда',
      type: 'expense', amount: 1250.5, date: '2024-06-15', description: 'Оренда за червень',
    });
    // Незалежна перевірка безпосередньо в таблиці
    const { rows } = await query('SELECT amount::text AS amount, operation_date::text AS d FROM transactions WHERE id = $1', [created.id]);
    assert.equal(rows[0].amount, '1250.50');
    assert.equal(rows[0].d, '2024-06-15');
  });

  it('IT-002: обмеження цілісності БД відхиляють некоректні дані', async () => {
    const base = { type: 'income', categoryId: incomeCategoryId, amount: 10, date: '2024-06-01', description: '' };
    // CHECK (amount > 0)
    await assert.rejects(transactionRepository.create(userId, { ...base, amount: -10 }), { code: '23514' });
    // FOREIGN KEY: неіснуюча категорія
    await assert.rejects(transactionRepository.create(userId, { ...base, categoryId: 999999 }), { code: '23503' });
    // FOREIGN KEY ... ON DELETE RESTRICT: категорію з операціями видалити не можна
    await transactionRepository.create(userId, base);
    await assert.rejects(categoryRepository.remove(incomeCategoryId), { code: '23001' });
    // UNIQUE (name, type): дубль категорії
    await assert.rejects(categoryRepository.create({ name: 'Продажі', type: 'income' }), { code: '23505' });
  });

  it('IT-003: агрегування звіту в SQL збігається з ручним розрахунком', async () => {
    await query('DELETE FROM transactions');
    const rows = [
      ['income', incomeCategoryId, 1000, '2024-03-05'],
      ['expense', expenseCategoryId, 300.5, '2024-03-10'],
      ['income', incomeCategoryId, 500, '2024-04-02'],
      ['expense', expenseCategoryId, 200, '2024-04-15'],
    ];
    for (const [type, categoryId, amount, date] of rows) {
      await transactionRepository.create(userId, { type, categoryId, amount, date, description: '' });
    }
    const { totals, byCategory, byMonth } = await reportRepository.summary('2024-01-01', '2024-12-31');
    assert.equal(totals.totalIncome, 1500);
    assert.equal(totals.totalExpense, 500.5);
    assert.equal(totals.count, 4);
    assert.deepEqual(byMonth.map((m) => m.month), ['2024-03', '2024-04']);
    assert.equal(byCategory.find((c) => c.name === 'Продажі').total, 1500);
    // Порожній період
    const empty = await reportRepository.summary('2000-01-01', '2000-12-31');
    assert.equal(empty.totals.count, 0);
    assert.deepEqual(empty.byMonth, []);
  });
});
