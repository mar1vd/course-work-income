// Інтеграційні тести REST API: запити проходять через весь стек (маршрут -> контролер ->
// сервіс -> репозиторій -> PostgreSQL) на окремій тестовій базі даних.
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';

// Налаштування тестового середовища має відбутися ДО імпорту застосунку
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://finance:finance@localhost:5432/finance_test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOGIN_RATE_LIMIT = '10000';

// Захист: тести повністю перестворюють таблиці, тому працюють лише з базою, назва якої закінчується на _test
const dbName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_test')) {
  throw new Error(`Тести можна запускати лише на тестовій БД (назва має закінчуватись на _test), а не на "${dbName}"`);
}

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/migrate.js');
const { closePool, query } = await import('../src/config/db.js');

const app = createApp();
const api = () => request(app);
const tokens = {};

// Вхід користувача і збереження токена для наступних запитів
async function loginAs(role) {
  const creds = { admin: 'admin@test.com', accountant: 'accountant@test.com', manager: 'manager@test.com' };
  const res = await api().post('/api/auth/login').send({ email: creds[role], password: 'password1' });
  assert.equal(res.status, 200);
  tokens[role] = res.body.token;
}
const as = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

// Тестові дані з відомими сумами (дати у минулому, щоб тести не залежали від поточної дати)
async function loadFixtures() {
  await migrate({ reset: true });
  const hash = bcrypt.hashSync('password1', 4);
  await query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES
       ('Тестовий Адмін', 'admin@test.com', $1, 'admin'),
       ('Тестовий Бухгалтер', 'accountant@test.com', $1, 'accountant'),
       ('Тестовий Керівник', 'manager@test.com', $1, 'manager')`,
    [hash]
  );
  await query(
    `INSERT INTO categories (name, type) VALUES
       ('Продажі', 'income'), ('Послуги', 'income'),
       ('Оренда', 'expense'), ('Зарплата', 'expense'), ('Порожня', 'expense')`
  );
  await query(
    `INSERT INTO transactions (user_id, category_id, amount, type, operation_date, description) VALUES
       (2, 1, 1000.00, 'income',  '2024-03-05', 'Оплата А'),
       (2, 3,  300.50, 'expense', '2024-03-10', 'Оренда березня'),
       (2, 2,  500.00, 'income',  '2024-04-02', 'Послуга Б'),
       (2, 4,  200.00, 'expense', '2024-04-15', 'Зарплата квітня'),
       (2, 1,  250.25, 'income',  '2024-04-20', 'Оплата В')`
  );
}

before(async () => {
  await loadFixtures();
  await loginAs('admin');
  await loginAs('accountant');
  await loginAs('manager');
});

after(async () => {
  await closePool();
});

describe('Службові маршрути', () => {
  it('GET /api/health — сервер і БД працюють', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok', database: 'up' });
  });

  it('невідомий маршрут повертає 404 у єдиному форматі помилки', async () => {
    const res = await api().get('/api/nothing-here').set(as('admin'));
    assert.equal(res.status, 404);
    assert.equal(res.body.status, 404);
    assert.ok(res.body.message);
  });

  it('невідомий маршрут без токена не розкривається — 401', async () => {
    const res = await api().get('/api/nothing-here');
    assert.equal(res.status, 401);
  });

  it('невідомий шлях поза /api — 404', async () => {
    const res = await api().get('/anything');
    assert.equal(res.status, 404);
  });

  it('відповіді містять захисні заголовки helmet', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('некоректний JSON у тілі запиту — 400', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    assert.equal(res.status, 400);
  });
});

describe('Автентифікація', () => {
  it('успішний вхід повертає токен і дані користувача без хешу пароля', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'accountant@test.com', password: 'password1' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.deepEqual(Object.keys(res.body.user).sort(), ['email', 'fullName', 'id', 'role']);
    assert.equal(res.body.user.role, 'accountant');
  });

  it('e-mail не залежить від регістру та пробілів', async () => {
    const res = await api().post('/api/auth/login').send({ email: '  ACCOUNTANT@test.com ', password: 'password1' });
    assert.equal(res.status, 200);
  });

  it('хибний пароль — 401', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'accountant@test.com', password: 'wrong-password' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Невірний e-mail або пароль');
  });

  it('неіснуючий e-mail — 401 з тим самим повідомленням (не розкриваємо, чи є користувач)', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@test.com', password: 'password1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Невірний e-mail або пароль');
  });

  it('порожні поля — 422 з помилками по полях', async () => {
    const res = await api().post('/api/auth/login').send({});
    assert.equal(res.status, 422);
    assert.ok(res.body.details.email);
    assert.ok(res.body.details.password);
  });

  it('захищений маршрут без токена — 401', async () => {
    const res = await api().get('/api/transactions');
    assert.equal(res.status, 401);
  });

  it('захищений маршрут з підробленим токеном — 401', async () => {
    const res = await api().get('/api/transactions').set('Authorization', 'Bearer not.a.token');
    assert.equal(res.status, 401);
  });

  it('GET /api/auth/me повертає поточного користувача', async () => {
    const res = await api().get('/api/auth/me').set(as('manager'));
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'manager@test.com');
  });

  it('паролі в базі зберігаються лише у вигляді bcrypt-хешу', async () => {
    const { rows } = await query("SELECT password_hash FROM users WHERE email = 'admin@test.com'");
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
    assert.notEqual(rows[0].password_hash, 'password1');
  });
});

describe('Операції: читання', () => {
  it('список повертає items, total, page, limit у форматі frontend', async () => {
    const res = await api().get('/api/transactions').set(as('accountant'));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 10);
    const t = res.body.items[0];
    assert.deepEqual(Object.keys(t).sort(), ['amount', 'categoryId', 'categoryName', 'date', 'description', 'id', 'type', 'userId']);
    assert.equal(typeof t.amount, 'number');
    assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('сортування: спочатку найновіші', async () => {
    const res = await api().get('/api/transactions').set(as('accountant'));
    const dates = res.body.items.map((t) => t.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  it('пагінація: limit=2, page=3 → одна остання операція', async () => {
    const res = await api().get('/api/transactions?limit=2&page=3').set(as('accountant'));
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.page, 3);
  });

  it('фільтр за типом', async () => {
    const res = await api().get('/api/transactions?type=expense').set(as('accountant'));
    assert.equal(res.body.total, 2);
    assert.ok(res.body.items.every((t) => t.type === 'expense'));
  });

  it('фільтр за категорією', async () => {
    const res = await api().get('/api/transactions?categoryId=1').set(as('accountant'));
    assert.equal(res.body.total, 2);
  });

  it('фільтр за періодом', async () => {
    const res = await api().get('/api/transactions?from=2024-04-01&to=2024-04-30').set(as('accountant'));
    assert.equal(res.body.total, 3);
  });

  it('пошук за описом (без урахування регістру)', async () => {
    const res = await api().get('/api/transactions?q=оренд').set(as('accountant'));
    assert.equal(res.body.total, 1);
    assert.equal(res.body.items[0].description, 'Оренда березня');
  });

  it('пошук за назвою категорії', async () => {
    const res = await api().get('/api/transactions?q=Послуги').set(as('accountant'));
    assert.equal(res.body.total, 1);
  });

  it('спецсимволи у пошуку сприймаються буквально (захист від LIKE-ін\'єкції)', async () => {
    const res = await api().get('/api/transactions?q=%25').set(as('accountant'));
    assert.equal(res.body.total, 0);
  });

  it('SQL-ін\'єкція в параметрі пошуку не ламає запит і нічого не повертає', async () => {
    const res = await api().get("/api/transactions?q=' OR '1'='1").set(as('accountant'));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM transactions');
    assert.equal(rows[0].n, 5);
  });

  it('некоректний тип фільтра — 400', async () => {
    const res = await api().get('/api/transactions?type=bogus').set(as('accountant'));
    assert.equal(res.status, 400);
  });

  it('некоректна дата у фільтрі — 422', async () => {
    const res = await api().get('/api/transactions?from=вчора').set(as('accountant'));
    assert.equal(res.status, 422);
  });

  it('керівник відділу може переглядати операції', async () => {
    const res = await api().get('/api/transactions').set(as('manager'));
    assert.equal(res.status, 200);
  });
});

describe('Операції: створення, зміна, видалення', () => {
  let createdId;
  const valid = { type: 'income', categoryId: 1, amount: 123.45, date: '2024-05-01', description: 'Нова операція' };

  it('бухгалтер створює операцію — 201 і повертається запис з назвою категорії', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send(valid);
    assert.equal(res.status, 201);
    assert.equal(res.body.categoryName, 'Продажі');
    assert.equal(res.body.amount, 123.45);
    assert.equal(res.body.userId, 2);
    createdId = res.body.id;
  });

  it('створена операція справді збережена в PostgreSQL', async () => {
    const { rows } = await query('SELECT amount, operation_date::text AS d FROM transactions WHERE id = $1', [createdId]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].d, '2024-05-01');
  });

  it('адміністратор теж може створювати операції', async () => {
    const res = await api().post('/api/transactions').set(as('admin')).send({ ...valid, description: 'від адміна' });
    assert.equal(res.status, 201);
  });

  it('керівник відділу не може створювати операції — 403', async () => {
    const res = await api().post('/api/transactions').set(as('manager')).send(valid);
    assert.equal(res.status, 403);
  });

  it('без токена створити операцію не можна — 401', async () => {
    const res = await api().post('/api/transactions').send(valid);
    assert.equal(res.status, 401);
  });

  it('від\'ємна або нульова сума — 422', async () => {
    for (const amount of [-5, 0]) {
      const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, amount });
      assert.equal(res.status, 422);
      assert.ok(res.body.details.amount);
    }
  });

  it('сума як рядок "1 250,50" не приймається, а "99,5" — приймається', async () => {
    const bad = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, amount: 'abc' });
    assert.equal(bad.status, 422);
    const ok = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, amount: '99,5' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.amount, 99.5);
  });

  it('більше двох знаків після коми — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, amount: 10.123 });
    assert.equal(res.status, 422);
  });

  it('дата у майбутньому — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, date: '2999-01-01' });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.date);
  });

  it('завтрашня дата (за часовим поясом підприємства) — 422', async () => {
    const { todayISO } = await import('../src/utils/validators.js');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, date: todayISO(tomorrow) });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.date);
  });

  it('сьогоднішня дата приймається — 201', async () => {
    const { todayISO } = await import('../src/utils/validators.js');
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, date: todayISO(), description: 'сьогодні' });
    assert.equal(res.status, 201);
  });

  it('неіснуюча календарна дата (30 лютого) — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, date: '2024-02-30' });
    assert.equal(res.status, 422);
  });

  it('категорія не відповідає типу операції — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, type: 'expense', categoryId: 1 });
    assert.equal(res.status, 422);
    assert.equal(res.body.details.categoryId, 'Категорія не відповідає типу операції');
  });

  it('неіснуюча категорія — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, categoryId: 9999 });
    assert.equal(res.status, 422);
  });

  it('занадто довгий опис — 422', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({ ...valid, description: 'x'.repeat(256) });
    assert.equal(res.status, 422);
  });

  it('порожнє тіло — 422 з переліком усіх помилок', async () => {
    const res = await api().post('/api/transactions').set(as('accountant')).send({});
    assert.equal(res.status, 422);
    assert.ok(res.body.details.type && res.body.details.categoryId && res.body.details.amount && res.body.details.date);
  });

  it('PUT змінює операцію', async () => {
    const res = await api()
      .put(`/api/transactions/${createdId}`)
      .set(as('accountant'))
      .send({ ...valid, amount: 999, description: 'змінено' });
    assert.equal(res.status, 200);
    assert.equal(res.body.amount, 999);
    assert.equal(res.body.description, 'змінено');
  });

  it('PUT неіснуючої операції — 404', async () => {
    const res = await api().put('/api/transactions/987654').set(as('accountant')).send(valid);
    assert.equal(res.status, 404);
  });

  it('керівник відділу не може змінювати і видаляти — 403', async () => {
    const put = await api().put(`/api/transactions/${createdId}`).set(as('manager')).send(valid);
    assert.equal(put.status, 403);
    const del = await api().delete(`/api/transactions/${createdId}`).set(as('manager'));
    assert.equal(del.status, 403);
  });

  it('некоректний ідентифікатор у URL — 400', async () => {
    const res = await api().delete('/api/transactions/abc').set(as('accountant'));
    assert.equal(res.status, 400);
  });

  it('DELETE — 204, повторне видалення — 404', async () => {
    const del = await api().delete(`/api/transactions/${createdId}`).set(as('accountant'));
    assert.equal(del.status, 204);
    const again = await api().delete(`/api/transactions/${createdId}`).set(as('accountant'));
    assert.equal(again.status, 404);
  });
});

describe('Категорії', () => {
  // Кожна група починає з однакового набору даних і не залежить від попередніх тестів
  before(loadFixtures);

  it('список містить кількість операцій у кожній категорії', async () => {
    const res = await api().get('/api/categories').set(as('manager'));
    assert.equal(res.status, 200);
    const sales = res.body.find((c) => c.name === 'Продажі');
    assert.equal(sales.transactionsCount, 2);
    assert.equal(res.body.find((c) => c.name === 'Порожня').transactionsCount, 0);
  });

  it('адміністратор створює категорію — 201', async () => {
    const res = await api().post('/api/categories').set(as('admin')).send({ name: 'Нова категорія', type: 'expense' });
    assert.equal(res.status, 201);
    assert.equal(res.body.transactionsCount, 0);
  });

  it('дублікат назви в межах типу (без урахування регістру) — 422', async () => {
    const res = await api().post('/api/categories').set(as('admin')).send({ name: 'оренда', type: 'expense' });
    assert.equal(res.status, 422);
    assert.equal(res.body.details.name, 'Така категорія вже існує');
  });

  it('та сама назва для іншого типу дозволена', async () => {
    const res = await api().post('/api/categories').set(as('admin')).send({ name: 'Оренда', type: 'income' });
    assert.equal(res.status, 201);
  });

  it('занадто коротка назва — 422', async () => {
    const res = await api().post('/api/categories').set(as('admin')).send({ name: 'a', type: 'income' });
    assert.equal(res.status, 422);
  });

  it('бухгалтер не може створювати категорії — 403', async () => {
    const res = await api().post('/api/categories').set(as('accountant')).send({ name: 'Заборонена', type: 'income' });
    assert.equal(res.status, 403);
  });

  it('PUT перейменовує категорію', async () => {
    const res = await api().put('/api/categories/5').set(as('admin')).send({ name: 'Перейменована', type: 'expense' });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Перейменована');
  });

  it('змінити тип використаної категорії — 409', async () => {
    const res = await api().put('/api/categories/1').set(as('admin')).send({ name: 'Продажі', type: 'expense' });
    assert.equal(res.status, 409);
  });

  it('видалити категорію, яку використано в операціях — 409', async () => {
    const res = await api().delete('/api/categories/1').set(as('admin'));
    assert.equal(res.status, 409);
    assert.match(res.body.message, /використано в операціях/);
  });

  it('видалити невикористану категорію — 204, потім 404', async () => {
    const del = await api().delete('/api/categories/5').set(as('admin'));
    assert.equal(del.status, 204);
    const again = await api().delete('/api/categories/5').set(as('admin'));
    assert.equal(again.status, 404);
  });
});

describe('Звіти', () => {
  // Кожна група починає з однакового набору даних і не залежить від попередніх тестів
  before(loadFixtures);

  it('підсумки за весь час збігаються з ручним розрахунком', async () => {
    const res = await api().get('/api/reports/summary').set(as('manager'));
    assert.equal(res.status, 200);
    assert.equal(res.body.count, 5);
    assert.equal(res.body.totalIncome, 1750.25);
    assert.equal(res.body.totalExpense, 500.5);
    assert.equal(res.body.profit, 1249.75);
  });

  it('підсумки за квітень', async () => {
    const res = await api().get('/api/reports/summary?from=2024-04-01&to=2024-04-30').set(as('manager'));
    assert.equal(res.body.count, 3);
    assert.equal(res.body.totalIncome, 750.25);
    assert.equal(res.body.totalExpense, 200);
  });

  it('розбивка за місяцями впорядкована за зростанням', async () => {
    const res = await api().get('/api/reports/summary').set(as('manager'));
    assert.deepEqual(res.body.byMonth, [
      { month: '2024-03', income: 1000, expense: 300.5 },
      { month: '2024-04', income: 750.25, expense: 200 },
    ]);
  });

  it('розбивка за категоріями впорядкована за спаданням суми', async () => {
    const res = await api().get('/api/reports/summary').set(as('manager'));
    const totals = res.body.byCategory.map((c) => c.total);
    assert.deepEqual(totals, [...totals].sort((a, b) => b - a));
    assert.deepEqual(res.body.byCategory[0], { categoryId: 1, name: 'Продажі', type: 'income', total: 1250.25 });
  });

  it('порожній період — нулі та порожні масиви', async () => {
    const res = await api().get('/api/reports/summary?from=2000-01-01&to=2000-12-31').set(as('manager'));
    assert.equal(res.body.count, 0);
    assert.equal(res.body.totalIncome, 0);
    assert.deepEqual(res.body.byCategory, []);
  });

  it('початок періоду пізніше за кінець — 422', async () => {
    const res = await api().get('/api/reports/summary?from=2024-05-01&to=2024-04-01').set(as('manager'));
    assert.equal(res.status, 422);
  });

  it('бухгалтер зберігає звіт в історію — 201, і бачить його у списку', async () => {
    const saved = await api().post('/api/reports').set(as('accountant')).send({ from: '2024-04-01', to: '2024-04-30' });
    assert.equal(saved.status, 201);
    assert.equal(saved.body.totalIncome, 750.25);
    const history = await api().get('/api/reports').set(as('accountant'));
    assert.equal(history.body.length, 1);
    const { rows } = await query('SELECT total_expense FROM reports WHERE id = $1', [saved.body.id]);
    assert.equal(Number(rows[0].total_expense), 200);
  });

  it('керівник відділу не може зберігати звіти — 403', async () => {
    const res = await api().post('/api/reports').set(as('manager')).send({ from: '2024-04-01', to: '2024-04-30' });
    assert.equal(res.status, 403);
  });
});

describe('Користувачі (лише адміністратор)', () => {
  // Кожна група починає з однакового набору даних і не залежить від попередніх тестів
  before(loadFixtures);

  let newId;

  it('бухгалтер не має доступу до списку користувачів — 403', async () => {
    const res = await api().get('/api/users').set(as('accountant'));
    assert.equal(res.status, 403);
  });

  it('адміністратор бачить список, у якому немає хешів паролів', async () => {
    const res = await api().get('/api/users').set(as('admin'));
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
    assert.ok(res.body.every((u) => u.passwordHash === undefined && u.password_hash === undefined));
  });

  it('створення користувача — 201, пароль зберігається як хеш', async () => {
    const res = await api()
      .post('/api/users')
      .set(as('admin'))
      .send({ fullName: 'Новий Працівник', email: 'New@Test.com', role: 'accountant', password: 'longpassword' });
    assert.equal(res.status, 201);
    assert.equal(res.body.email, 'new@test.com');
    newId = res.body.id;
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [newId]);
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
  });

  it('новий користувач може увійти зі своїм паролем', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'new@test.com', password: 'longpassword' });
    assert.equal(res.status, 200);
  });

  it('дубль e-mail — 409', async () => {
    const res = await api()
      .post('/api/users')
      .set(as('admin'))
      .send({ fullName: 'Дублікат', email: 'new@test.com', role: 'manager', password: 'longpassword' });
    assert.equal(res.status, 409);
  });

  it('короткий пароль і невірна роль — 422', async () => {
    const res = await api().post('/api/users').set(as('admin')).send({ fullName: 'Хтось', email: 'x@test.com', role: 'boss', password: '123' });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.password && res.body.details.role);
  });

  it('зміна ролі діє одразу, без повторного входу', async () => {
    const before = await api().post('/api/auth/login').send({ email: 'new@test.com', password: 'longpassword' });
    const token = before.body.token;
    assert.equal((await api().post('/api/transactions').set({ Authorization: `Bearer ${token}` }).send({ type: 'income', categoryId: 1, amount: 1, date: '2024-05-01' })).status, 201);
    await api().put(`/api/users/${newId}`).set(as('admin')).send({ fullName: 'Новий Працівник', email: 'new@test.com', role: 'manager' });
    const after = await api().post('/api/transactions').set({ Authorization: `Bearer ${token}` }).send({ type: 'income', categoryId: 1, amount: 1, date: '2024-05-01' });
    assert.equal(after.status, 403);
  });

  it('не можна видалити власний обліковий запис — 409', async () => {
    const res = await api().delete('/api/users/1').set(as('admin'));
    assert.equal(res.status, 409);
  });

  it('не можна позбавити систему останнього адміністратора — 409', async () => {
    const res = await api().put('/api/users/1').set(as('admin')).send({ fullName: 'Тестовий Адмін', email: 'admin@test.com', role: 'manager' });
    assert.equal(res.status, 409);
  });

  it('не можна видалити користувача, який має операції — 409', async () => {
    const res = await api().delete('/api/users/2').set(as('admin'));
    assert.equal(res.status, 409);
  });

  it('видалення користувача без операцій — 204 і токен перестає діяти', async () => {
    const login = await api().post('/api/auth/login').send({ email: 'new@test.com', password: 'longpassword' });
    // користувач створив операцію вище, тому спершу видаляємо її записи
    await query('DELETE FROM transactions WHERE user_id = $1', [newId]);
    const del = await api().delete(`/api/users/${newId}`).set(as('admin'));
    assert.equal(del.status, 204);
    const res = await api().get('/api/transactions').set({ Authorization: `Bearer ${login.body.token}` });
    assert.equal(res.status, 401);
  });
});
