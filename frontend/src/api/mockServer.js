// Імітація REST-сервера прямо в браузері. Дані зберігаються в localStorage.
// Використовується, коли бекенд ще не готовий (див. client.js).
// Мережеву помилку можна змоделювати командою в консолі браузера:
//   localStorage.setItem('ie_mock_offline', '1')   (вимкнути: removeItem)


import { ApiError } from './ApiError.js';

const DB_KEY = 'ie_mock_db_v1';
// штучна затримка (мс), щоб було видно стан «Завантаження»
const LATENCY_MS = 350;

const USERS = [
  { id: 1, fullName: 'Адміністратор Системи', email: 'admin@demo.com', password: 'admin1234', role: 'admin' },
  { id: 2, fullName: 'Олена Коваль', email: 'accountant@demo.com', password: 'demo1234', role: 'accountant' },
  { id: 3, fullName: 'Ігор Петренко', email: 'manager@demo.com', password: 'manager1234', role: 'manager' },
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round2 = (n) => Math.round(n * 100) / 100;

// Початкові дані: категорії та операції за останні 6 місяців
function seed() {
  const categories = [
    { id: 1, name: 'Продажі', type: 'income' },
    { id: 2, name: 'Послуги', type: 'income' },
    { id: 3, name: 'Інші надходження', type: 'income' },
    { id: 4, name: 'Зарплата', type: 'expense' },
    { id: 5, name: 'Оренда офісу', type: 'expense' },
    { id: 6, name: 'Реклама', type: 'expense' },
    { id: 7, name: 'Комунальні послуги', type: 'expense' },
    { id: 8, name: 'Закупівля матеріалів', type: 'expense' },
  ];

  // Простий детермінований генератор, щоб дані щоразу були однаковими
  let state = 42;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const between = (min, max) => Math.round((min + rnd() * (max - min)) / 10) * 10;

  const today = new Date();
  const transactions = [];
  let id = 1;
  for (let m = 5; m >= 0; m--) {
    const first = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const add = (day, categoryId, type, amount, description) => {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      if (date > today) return;
      transactions.push({ id: id++, userId: 2, categoryId, type, amount, date: toISO(date), description });
    };
    add(1, 5, 'expense', 7000, 'Оренда офісу');
    add(3, 4, 'expense', between(24000, 27000), 'Зарплата працівникам');
    add(5, 1, 'income', between(15000, 30000), 'Оплата від клієнта');
    add(9, 2, 'income', between(8000, 15000), 'Надання послуг');
    add(12, 6, 'expense', between(1500, 4000), 'Рекламна кампанія');
    add(15, 7, 'expense', between(1200, 2200), 'Комунальні платежі');
    add(18, 1, 'income', between(10000, 20000), 'Оплата від клієнта');
    add(22, 8, 'expense', between(3000, 9000), 'Закупівля матеріалів');
    add(26, 3, 'income', between(500, 3000), 'Інші надходження');
  }
  return { categories, transactions, nextTxId: id, nextCatId: categories.length + 1 };
}

// Читання «бази» з localStorage (або створення початкових даних)
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  const db = seed();
  save(db);
  return db;
}

// Збереження «бази» в localStorage
function save(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
  }
}

const categoryName = (db, id) => db.categories.find((c) => c.id === id)?.name ?? '—';

// Перевіряє токен вигляду mock-token-<id>; якщо недійсний — HTTP 401
function authenticate(token) {
  const match = /^mock-token-(\d+)$/.exec(token || '');
  const user = match && USERS.find((u) => u.id === Number(match[1]));
  if (!user) throw new ApiError('Потрібна авторизація. Увійдіть у систему.', 401);
  return user;
}

// Перевірка ролі: якщо прав недостатньо — HTTP 403
function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw new ApiError('Недостатньо прав для виконання цієї дії', 403);
}

// Серверна валідація операції: при помилках повертає HTTP 422 з описом по полях
function validateTransaction(db, body) {
  const details = {};
  if (!['income', 'expense'].includes(body.type)) details.type = 'Оберіть тип операції';
  const category = db.categories.find((c) => c.id === Number(body.categoryId));
  if (!category) details.categoryId = 'Оберіть категорію';
  else if (category.type !== body.type) details.categoryId = 'Категорія не відповідає типу операції';
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) details.amount = 'Сума має бути додатним числом';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) details.date = 'Вкажіть коректну дату';
  else if (body.date > toISO(new Date())) details.date = 'Дата не може бути у майбутньому';
  if ((body.description || '').length > 255) details.description = 'Опис — не більше 255 символів';
  if (Object.keys(details).length) throw new ApiError('Перевірте правильність заповнення форми', 422, details);
}

// Серверна валідація категорії (назва 2–100 символів, унікальність у межах типу)
function validateCategory(db, body, ignoreId = null) {
  const details = {};
  const name = (body.name || '').trim();
  if (name.length < 2 || name.length > 100) details.name = 'Назва — від 2 до 100 символів';
  if (!['income', 'expense'].includes(body.type)) details.type = 'Оберіть тип категорії';
  const duplicate = db.categories.some(
    (c) => c.id !== ignoreId && c.type === body.type && c.name.toLowerCase() === name.toLowerCase()
  );
  if (!details.name && duplicate) details.name = 'Така категорія вже існує';
  if (Object.keys(details).length) throw new ApiError('Перевірте правильність заповнення форми', 422, details);
}

// Підсумки для дашборду та звітів: суми, розбивка за категоріями та за місяцями
function buildSummary(db, from, to) {
  const list = db.transactions.filter((t) => t.date >= from && t.date <= to);
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map();
  const byMonth = new Map();
  list.forEach((t) => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;

    const cat = byCategory.get(t.categoryId) ?? {
      categoryId: t.categoryId,
      name: categoryName(db, t.categoryId),
      type: t.type,
      total: 0,
    };
    cat.total += t.amount;
    byCategory.set(t.categoryId, cat);

    const month = t.date.slice(0, 7);
    const m = byMonth.get(month) ?? { month, income: 0, expense: 0 };
    m[t.type] += t.amount;
    byMonth.set(month, m);
  });
  return {
    from,
    to,
    count: list.length,
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    profit: round2(totalIncome - totalExpense),
    byCategory: [...byCategory.values()].map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total),
    byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

// Головний обробник: емулює маршрутизацію REST-сервера (метод + шлях)
export async function mockRequest(method, url, body, token) {
  await sleep(LATENCY_MS);

  // Емуляція відсутності мережі (для демонстрації обробки помилок)
  if (localStorage.getItem('ie_mock_offline') === '1') {
    throw new ApiError('Не вдалося завантажити дані. Перевірте підключення до Інтернету та повторіть спробу.', 0);
  }

  const parsed = new URL(url, 'http://mock.local');
  const path = parsed.pathname;
  const query = Object.fromEntries(parsed.searchParams.entries());
  const db = load();

  // --- Автентифікація: POST /auth/login ---
  if (method === 'POST' && path === '/auth/login') {
    const user = USERS.find((u) => u.email === (body?.email || '').trim().toLowerCase());
    if (!user || user.password !== body?.password) throw new ApiError('Невірний e-mail або пароль', 401);
    return { token: `mock-token-${user.id}`, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } };
  }

  // Усі маршрути нижче вимагають авторизації
  const user = authenticate(token);
  let match;

  // --- Операції ---
  // GET /transactions: фільтри, пошук, сортування за датою та пагінація
  if (method === 'GET' && path === '/transactions') {
    let list = db.transactions.slice();
    if (query.type) list = list.filter((t) => t.type === query.type);
    if (query.categoryId) list = list.filter((t) => t.categoryId === Number(query.categoryId));
    if (query.from) list = list.filter((t) => t.date >= query.from);
    if (query.to) list = list.filter((t) => t.date <= query.to);
    if (query.q) {
      const needle = query.q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(needle) ||
          categoryName(db, t.categoryId).toLowerCase().includes(needle)
      );
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const items = list
      .slice((page - 1) * limit, page * limit)
      .map((t) => ({ ...t, categoryName: categoryName(db, t.categoryId) }));
    return { items, total: list.length, page, limit };
  }

  // POST /transactions: створення (лише admin та accountant)
  if (method === 'POST' && path === '/transactions') {
    requireRole(user, ['admin', 'accountant']);
    validateTransaction(db, body || {});
    const tx = {
      id: db.nextTxId++,
      userId: user.id,
      type: body.type,
      categoryId: Number(body.categoryId),
      amount: round2(Number(body.amount)),
      date: body.date,
      description: (body.description || '').trim(),
    };
    db.transactions.push(tx);
    save(db);
    return { ...tx, categoryName: categoryName(db, tx.categoryId) };
  }

  // PUT та DELETE /transactions/:id
  if ((match = /^\/transactions\/(\d+)$/.exec(path))) {
    const tx = db.transactions.find((t) => t.id === Number(match[1]));
    if (!tx) throw new ApiError('Операцію не знайдено', 404);
    if (method === 'PUT') {
      requireRole(user, ['admin', 'accountant']);
      validateTransaction(db, body || {});
      Object.assign(tx, {
        type: body.type,
        categoryId: Number(body.categoryId),
        amount: round2(Number(body.amount)),
        date: body.date,
        description: (body.description || '').trim(),
      });
      save(db);
      return { ...tx, categoryName: categoryName(db, tx.categoryId) };
    }
    if (method === 'DELETE') {
      requireRole(user, ['admin', 'accountant']);
      db.transactions = db.transactions.filter((t) => t.id !== tx.id);
      save(db);
      return null;
    }
  }

  // --- Категорії: GET /categories (з кількістю операцій у кожній) ---
  if (method === 'GET' && path === '/categories') {
    return db.categories
      .map((c) => ({ ...c, transactionsCount: db.transactions.filter((t) => t.categoryId === c.id).length }))
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, 'uk'));
  }

  // POST /categories (лише admin)
  if (method === 'POST' && path === '/categories') {
    requireRole(user, ['admin']);
    validateCategory(db, body || {});
    const category = { id: db.nextCatId++, name: body.name.trim(), type: body.type };
    db.categories.push(category);
    save(db);
    return { ...category, transactionsCount: 0 };
  }

  // PUT та DELETE /categories/:id; категорію з операціями видалити не можна (HTTP 409)
  if ((match = /^\/categories\/(\d+)$/.exec(path))) {
    const category = db.categories.find((c) => c.id === Number(match[1]));
    if (!category) throw new ApiError('Категорію не знайдено', 404);
    if (method === 'PUT') {
      requireRole(user, ['admin']);
      validateCategory(db, body || {}, category.id);
      category.name = body.name.trim();
      category.type = body.type;
      save(db);
      return { ...category };
    }
    if (method === 'DELETE') {
      requireRole(user, ['admin']);
      const used = db.transactions.filter((t) => t.categoryId === category.id).length;
      if (used > 0) {
        throw new ApiError(`Категорію використано в операціях (${used}), видалення неможливе`, 409);
      }
      db.categories = db.categories.filter((c) => c.id !== category.id);
      save(db);
      return null;
    }
  }

  // --- Звіти: GET /reports/summary?from=&to= ---
  if (method === 'GET' && path === '/reports/summary') {
    return buildSummary(db, query.from || '0000-01-01', query.to || '9999-12-31');
  }

  throw new ApiError('Ресурс не знайдено', 404);
}
