// Початкові дані для демонстрації: користувачі, категорії та операції за останні 6 місяців.
// Запуск: npm run db:seed
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { closePool, query } from '../config/db.js';
import { config } from '../config/env.js';

const USERS = [
  { fullName: 'Адміністратор Системи', email: 'admin@demo.com', password: 'admin1234', role: 'admin' },
  { fullName: 'Олена Коваль', email: 'accountant@demo.com', password: 'demo1234', role: 'accountant' },
  { fullName: 'Ігор Петренко', email: 'manager@demo.com', password: 'manager1234', role: 'manager' },
];

const CATEGORIES = [
  ['Продажі', 'income'],
  ['Послуги', 'income'],
  ['Інші надходження', 'income'],
  ['Зарплата', 'expense'],
  ['Оренда офісу', 'expense'],
  ['Реклама', 'expense'],
  ['Комунальні послуги', 'expense'],
  ['Закупівля матеріалів', 'expense'],
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export async function seed() {
  // Повне очищення таблиць і скидання лічильників ідентифікаторів
  await query('TRUNCATE reports, transactions, categories, users RESTART IDENTITY CASCADE');

  const ids = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, config.bcryptRounds);
    const { rows } = await query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [u.fullName, u.email, hash, u.role]
    );
    ids[u.role] = rows[0].id;
  }

  const catId = {};
  for (const [name, type] of CATEGORIES) {
    const { rows } = await query('INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING id', [name, type]);
    catId[name] = rows[0].id;
  }

  // Детермінований генератор: суми щоразу однакові
  let state = 42;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const between = (min, max) => Math.round((min + rnd() * (max - min)) / 10) * 10;

  const today = new Date();
  let count = 0;
  for (let m = 5; m >= 0; m--) {
    const first = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const add = async (day, category, type, amount, description) => {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      if (date > today) return;
      await query(
        `INSERT INTO transactions (user_id, category_id, amount, type, operation_date, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ids.accountant, catId[category], amount, type, toISO(date), description]
      );
      count++;
    };
    await add(1, 'Оренда офісу', 'expense', 7000, 'Оренда офісу');
    await add(3, 'Зарплата', 'expense', between(24000, 27000), 'Зарплата працівникам');
    await add(5, 'Продажі', 'income', between(15000, 30000), 'Оплата від клієнта');
    await add(9, 'Послуги', 'income', between(8000, 15000), 'Надання послуг');
    await add(12, 'Реклама', 'expense', between(1500, 4000), 'Рекламна кампанія');
    await add(15, 'Комунальні послуги', 'expense', between(1200, 2200), 'Комунальні платежі');
    await add(18, 'Продажі', 'income', between(10000, 20000), 'Оплата від клієнта');
    await add(22, 'Закупівля матеріалів', 'expense', between(3000, 9000), 'Закупівля матеріалів');
    await add(26, 'Інші надходження', 'income', between(500, 3000), 'Інші надходження');
  }
  return { users: USERS.length, categories: CATEGORIES.length, transactions: count };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then((r) => console.log(`Додано: користувачів — ${r.users}, категорій — ${r.categories}, операцій — ${r.transactions}`))
    .catch((error) => {
      console.error('Помилка заповнення БД:', error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
