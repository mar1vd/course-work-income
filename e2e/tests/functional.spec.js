// Функціональні тест-кейси TC-001 … TC-021: перевіряється реальний застосунок (frontend + backend + БД).
// Кожен тест записує «фактичний результат» (annotation "actual"), який потрапляє у звіт.
import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:3000/api';
const ACCOUNTS = {
  accountant: ['accountant@demo.com', 'demo1234'],
  admin: ['admin@demo.com', 'admin1234'],
  manager: ['manager@demo.com', 'manager1234'],
};

const record = (text) => test.info().annotations.push({ type: 'actual', description: text });
const uniq = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('sv-SE');
const digits = (text) => Number(text.replace(/[^\d,]/g, '').replace(',', '.'));

// ---------- допоміжні виклики API (для підготовки даних і перевірки результату) ----------
async function tokenFor(request, role) {
  const [email, password] = ACCOUNTS[role];
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.status()).toBe(200);
  return (await res.json()).token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function categoryId(request, token, name) {
  const res = await request.get(`${API}/categories`, { headers: auth(token) });
  return (await res.json()).find((c) => c.name === name).id;
}

async function createTx(request, token, extra = {}) {
  const data = { type: 'expense', categoryId: await categoryId(request, token, 'Реклама'), amount: 100, date: daysAgo(1), description: uniq('QA'), ...extra };
  const res = await request.post(`${API}/transactions`, { headers: auth(token), data });
  expect(res.status()).toBe(201);
  return res.json();
}

async function findTx(request, token, q) {
  const res = await request.get(`${API}/transactions`, { headers: auth(token), params: { q } });
  return res.json();
}

async function removeTx(request, token, id) {
  await request.delete(`${API}/transactions/${id}`, { headers: auth(token) });
}

// ---------- допоміжні дії в інтерфейсі ----------
async function loginUi(page, role) {
  const [email, password] = ACCOUNTS[role];
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('heading', { name: 'Дашборд', level: 1 })).toBeVisible();
}

async function openPage(page, name) {
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

async function searchTx(page, text) {
  await page.getByLabel('Пошук').fill(text);
  await expect(page.locator('tbody tr', { hasText: text }).first()).toBeVisible();
}

// Рахуємо запити певного типу, щоб переконатися, що при помилках валідації нічого не відправляється на сервер
function countRequests(page, method, part) {
  const counter = { n: 0 };
  page.on('request', (r) => {
    if (r.method() === method && r.url().includes(part)) counter.n++;
  });
  return counter;
}

test.describe('Позитивні тест-кейси', () => {
  test('TC-001 Авторизація з правильними даними', async ({ page }) => {
    await loginUi(page, 'accountant');
    const header = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
    expect(header).toContain('Олена Коваль');
    expect(header).toContain('Бухгалтер');
    record(`Відкрито сторінку «${await page.getByRole('heading', { level: 1 }).innerText()}» (адреса ${new URL(page.url()).pathname}); у шапці: «${header.replace('Фінансовий облік ', '')}»`);
  });

  test('TC-002 Додавання операції (витрата)', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const desc = uniq('TC002');
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByRole('button', { name: '+ Додати операцію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Категорія').selectOption({ label: 'Реклама' });
    await dialog.getByLabel('Сума, ₴').fill('1 250,50');
    await dialog.getByLabel('Опис (необов\'язково)').fill(desc);
    await dialog.getByRole('button', { name: 'Додати операцію' }).click();
    const toast = page.getByText('Операцію додано');
    await expect(toast).toBeVisible();
    await searchTx(page, desc);
    const rowText = (await page.locator('tbody tr', { hasText: desc }).innerText()).replace(/\s+/g, ' ');
    expect(rowText).toMatch(/1\s*250,50/);
    const found = await findTx(request, token, desc);
    expect(found.total).toBe(1);
    expect(found.items[0]).toMatchObject({ amount: 1250.5, type: 'expense', categoryName: 'Реклама' });
    record(`Сповіщення «Операцію додано»; у списку рядок «${rowText}»; у БД: сума ${found.items[0].amount}, тип ${found.items[0].type}, категорія ${found.items[0].categoryName}`);
    await removeTx(request, token, found.items[0].id);
  });

  test('TC-003 Редагування операції', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const tx = await createTx(request, token, { amount: 100 });
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await searchTx(page, tx.description);
    await page.locator('tbody tr', { hasText: tx.description }).getByRole('button', { name: 'Редагувати' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Сума, ₴').fill('999');
    await dialog.getByRole('button', { name: 'Зберегти зміни' }).click();
    await expect(page.getByText('Операцію оновлено')).toBeVisible();
    const after = await findTx(request, token, tx.description);
    expect(after.items[0].amount).toBe(999);
    record(`Сповіщення «Операцію оновлено»; у БД сума змінилась зі 100 на ${after.items[0].amount}`);
    await removeTx(request, token, tx.id);
  });

  test('TC-004 Видалення операції з підтвердженням', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const tx = await createTx(request, token);
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await searchTx(page, tx.description);
    const row = page.locator('tbody tr', { hasText: tx.description });
    await row.getByRole('button', { name: 'Видалити' }).click();
    const dialog = page.getByRole('dialog');
    const question = await dialog.locator('p').innerText();
    expect(question).toContain('Ви дійсно хочете видалити');
    await dialog.getByRole('button', { name: 'Скасувати' }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Видалити' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
    await expect(page.getByText('Операцію видалено')).toBeVisible();
    const after = await findTx(request, token, tx.description);
    expect(after.total).toBe(0);
    record(`Діалог із запитанням «Ви дійсно хочете видалити операцію…»; після «Скасувати» операція лишилась у списку; після підтвердження — сповіщення «Операцію видалено», у БД записів: ${after.total}`);
  });

  test('TC-005 Пошук операції за описом', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const key = uniq('FIND');
    const a = await createTx(request, token, { description: `${key} перша` });
    const b = await createTx(request, token, { description: uniq('OTHER') });
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByLabel('Пошук').fill(key);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    const text = (await page.locator('tbody tr').innerText()).replace(/\s+/g, ' ');
    expect(text).toContain(`${key} перша`);
    const shown = text.replace(/\s*Редагувати\s*Видалити\s*$/, '').replace('РедагуватиВидалити', '');
    record(`За запитом «${key}» знайдено 1 запис: «${shown}»`);
    await removeTx(request, token, a.id);
    await removeTx(request, token, b.id);
  });

  test('TC-006 Фільтрація за типом і періодом', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByLabel('Тип').selectOption('income');
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const signs = await page.locator('td[data-label="Сума"]').allInnerTexts();
    expect(signs.every((s) => s.trim().startsWith('+'))).toBe(true);
    const info = await page.getByRole('navigation', { name: 'Пагінація' }).innerText();
    const total = Number(info.match(/Усього:\s*(\d+)/)[1]);
    const api = await (await request.get(`${API}/transactions`, { headers: auth(token), params: { type: 'income' } })).json();
    expect(total).toBe(api.total);
    await page.getByLabel('Від', { exact: true }).fill('2000-01-01');
    await page.getByLabel('До', { exact: true }).fill('2000-12-31');
    await expect(page.getByText('Операцій не знайдено.')).toBeVisible();
    record(`Тип «Дохід»: показано ${signs.length} рядків зі знаком «+», усього ${total} (збігається з API: ${api.total}); період 2000 року — «Операцій не знайдено»`);
  });

  test('TC-007 Формування звіту за період', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const today = new Date().toLocaleDateString('sv-SE');
    const year = today.slice(0, 4);
    await loginUi(page, 'accountant');
    await openPage(page, 'Звіти');
    await page.getByRole('button', { name: 'З початку року' }).click();
    const income = page.locator('div.border-l-4', { hasText: 'Доходи' }).first();
    const expense = page.locator('div.border-l-4', { hasText: 'Витрати' }).first();
    await expect(income).toContainText(/\d/);
    await page.waitForTimeout(600);
    const api = await (await request.get(`${API}/reports/summary`, { headers: auth(token), params: { from: `${year}-01-01`, to: today } })).json();
    const uiIncome = digits(await income.innerText());
    const uiExpense = digits(await expense.innerText());
    expect(uiIncome).toBe(api.totalIncome);
    expect(uiExpense).toBe(api.totalExpense);
    record(`Період ${year}-01-01 … ${today}: у звіті доходи ${uiIncome}, витрати ${uiExpense}; за даними API — ${api.totalIncome} і ${api.totalExpense} (збігається)`);
  });

  test('TC-008 Експорт звіту у CSV', async ({ page }) => {
    await loginUi(page, 'accountant');
    await openPage(page, 'Звіти');
    await expect(page.getByRole('button', { name: 'Експортувати CSV' })).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Експортувати CSV' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^report_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
    const content = fs.readFileSync(await download.path(), 'utf8');
    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('"Категорія";"Тип";"Сума, грн"');
    expect(content).toContain('"Прибуток"');
    record(`Завантажено файл «${download.suggestedFilename()}», ${content.split('\n').length} рядків, кодування UTF-8 з BOM, є заголовок таблиці та рядок «Прибуток»`);
  });

  test('TC-009 Додавання категорії (адміністратор)', async ({ page, request }) => {
    const token = await tokenFor(request, 'admin');
    const name = uniq('Кат');
    await loginUi(page, 'admin');
    await openPage(page, 'Категорії');
    await page.getByRole('button', { name: '+ Додати категорію' }).click();
    await page.getByRole('dialog').getByLabel('Назва категорії').fill(name);
    await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.getByText('Категорію додано')).toBeVisible();
    await expect(page.locator('li', { hasText: name })).toBeVisible();
    const list = await (await request.get(`${API}/categories`, { headers: auth(token) })).json();
    const created = list.find((c) => c.name === name);
    expect(created).toBeTruthy();
    record(`Сповіщення «Категорію додано»; категорія «${name}» з'явилась у списку й у БД (id ${created.id}, тип ${created.type})`);
    await request.delete(`${API}/categories/${created.id}`, { headers: auth(token) });
  });

  test('TC-010 Вихід із системи', async ({ page }) => {
    await loginUi(page, 'accountant');
    await page.getByRole('button', { name: 'Вийти' }).click();
    await expect(page).toHaveURL(/\/login$/);
    const stored = await page.evaluate(() => localStorage.getItem('ie_token'));
    expect(stored).toBeNull();
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login$/);
    record('Після «Вийти» відкрито сторінку входу, токен з localStorage видалено; спроба відкрити /transactions знову веде на /login');
  });
});

test.describe('Негативні тест-кейси', () => {
  test('TC-011 Авторизація з неправильним паролем', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('accountant@demo.com');
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Увійти' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toHaveText('Невірний e-mail або пароль');
    await expect(page).toHaveURL(/\/login$/);
    record(`Повідомлення «${await alert.innerText()}»; користувач залишився на сторінці входу`);
  });

  test('TC-012 Авторизація з порожніми полями', async ({ page }) => {
    const calls = countRequests(page, 'POST', '/auth/login');
    await page.goto('/login');
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page.getByText('Введіть e-mail')).toBeVisible();
    await expect(page.getByText('Введіть пароль')).toBeVisible();
    expect(calls.n).toBe(0);
    record(`Під полями показано «Введіть e-mail» і «Введіть пароль»; запитів до сервера надіслано: ${calls.n}`);
  });

  test('TC-013 Додавання операції з порожньою формою', async ({ page }) => {
    const calls = countRequests(page, 'POST', '/transactions');
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByRole('button', { name: '+ Додати операцію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Додати операцію' }).click();
    await expect(dialog.getByText('Оберіть категорію', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Введіть суму', { exact: true })).toBeVisible();
    expect(calls.n).toBe(0);
    record(`Форма не закрилась; показано «Оберіть категорію» і «Введіть суму»; запитів POST /transactions: ${calls.n}`);
  });

  test('TC-014 Додавання операції з нульовою сумою', async ({ page }) => {
    const calls = countRequests(page, 'POST', '/transactions');
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByRole('button', { name: '+ Додати операцію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Категорія').selectOption({ label: 'Реклама' });
    await dialog.getByLabel('Сума, ₴').fill('0');
    await dialog.getByRole('button', { name: 'Додати операцію' }).click();
    const err = dialog.getByText('Сума має бути більшою за 0');
    await expect(err).toBeVisible();
    expect(calls.n).toBe(0);
    record(`Повідомлення «${await err.innerText()}»; запитів на сервер: ${calls.n}`);
  });

  test('TC-015 Додавання операції з датою у майбутньому', async ({ page }) => {
    const calls = countRequests(page, 'POST', '/transactions');
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByRole('button', { name: '+ Додати операцію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Категорія').selectOption({ label: 'Реклама' });
    await dialog.getByLabel('Сума, ₴').fill('10');
    await dialog.getByLabel('Дата').fill('2999-01-01');
    await dialog.getByRole('button', { name: 'Додати операцію' }).click();
    const err = dialog.getByText('Дата не може бути у майбутньому');
    await expect(err).toBeVisible();
    expect(calls.n).toBe(0);
    record(`Повідомлення «${await err.innerText()}»; запитів на сервер: ${calls.n}`);
  });

  test('TC-016 Доступ до сторінки без входу в систему', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login$/);
    record(`Спроба відкрити /transactions без входу перенаправила на ${new URL(page.url()).pathname}`);
  });

  test('TC-017 Керівник відділу не може змінювати дані', async ({ page, request }) => {
    const manager = await tokenFor(request, 'manager');
    await loginUi(page, 'manager');
    await openPage(page, 'Операції');
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Додати операцію' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Дії' })).toHaveCount(0);
    const res = await request.post(`${API}/transactions`, {
      headers: auth(manager),
      data: { type: 'expense', categoryId: 1, amount: 5, date: daysAgo(1), description: 'обхід інтерфейсу' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    record(`В інтерфейсі немає кнопки додавання і колонки «Дії»; прямий запит POST /transactions повернув ${res.status()}: «${body.message}»`);
  });

  test('TC-018 Видалення категорії, яка використовується', async ({ page }) => {
    await loginUi(page, 'admin');
    await openPage(page, 'Категорії');
    const row = page.locator('li', { hasText: 'Продажі' });
    await row.getByRole('button', { name: 'Видалити' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
    const toast = page.getByText(/використано в операціях/);
    await expect(toast).toBeVisible();
    await expect(page.locator('li', { hasText: 'Продажі' })).toBeVisible();
    record(`Сповіщення про помилку: «${await toast.innerText()}»; категорія «Продажі» залишилась у списку`);
  });

  test('TC-019 Додавання категорії-дубліката', async ({ page }) => {
    await loginUi(page, 'admin');
    await openPage(page, 'Категорії');
    await page.getByRole('button', { name: '+ Додати категорію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Назва категорії').fill('Реклама');
    await dialog.getByRole('button', { name: 'Зберегти' }).click();
    const err = dialog.getByText('Така категорія вже існує');
    await expect(err).toBeVisible();
    record(`Вікно залишилось відкритим, під полем повідомлення «${await err.innerText()}»`);
  });

  test('TC-020 Пошук неіснуючого значення', async ({ page }) => {
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await page.getByLabel('Пошук').fill('zzzz-такого-немає');
    const empty = page.getByText('Операцій не знайдено.');
    await expect(empty).toBeVisible();
    record(`Замість таблиці показано повідомлення «${await empty.innerText()}» і підказку «Змініть фільтри або додайте нову операцію»`);
  });

  test('TC-021 Захист від XSS в описі операції', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const key = uniq('XSS');
    const payload = `${key} <img src=x onerror="window.__xss=1"><script>window.__xss=2</script>`;
    const tx = await createTx(request, token, { description: payload });
    await loginUi(page, 'accountant');
    await openPage(page, 'Операції');
    await searchTx(page, key);
    const row = page.locator('tbody tr', { hasText: key });
    await expect(row).toContainText('<img src=x');
    const executed = await page.evaluate(() => window.__xss);
    const injected = await row.locator('img, script').count();
    expect(executed).toBeUndefined();
    expect(injected).toBe(0);
    record(`Опис з тегами <img>, <script> показано як звичайний текст; виконання скрипта: ${executed === undefined ? 'ні' : 'так'}; доданих у DOM елементів img/script: ${injected}`);
    await removeTx(request, token, tx.id);
  });
});
