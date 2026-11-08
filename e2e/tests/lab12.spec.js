// Функціональні тест-кейси ЛР № 12: історія дій (Observer) та експорт у Excel (Strategy).
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
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function tokenFor(request, role) {
  const [email, password] = ACCOUNTS[role];
  const res = await request.post(`${API}/auth/login`, { data: { email, password } });
  expect(res.status()).toBe(200);
  return (await res.json()).token;
}

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

test.describe('ЛР № 12', () => {
  test('TC-022 Історія дій бухгалтера: створення, зміна, видалення', async ({ page, request }) => {
    const token = await tokenFor(request, 'accountant');
    const cats = await (await request.get(`${API}/categories`, { headers: auth(token) })).json();
    const categoryId = cats.find((c) => c.name === 'Реклама').id;
    const description = uniq('HIST');
    const data = { type: 'expense', categoryId, amount: 100, date: daysAgo(1), description };
    const created = await (await request.post(`${API}/transactions`, { headers: auth(token), data })).json();
    await request.put(`${API}/transactions/${created.id}`, { headers: auth(token), data: { ...data, amount: 999 } });
    await request.delete(`${API}/transactions/${created.id}`, { headers: auth(token) });

    await loginUi(page, 'accountant');
    await openPage(page, 'Історія дій');
    const rows = page.locator('tbody tr', { hasText: `№ ${created.id}` });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Видалення');
    await expect(rows.nth(1)).toContainText('Зміна');
    await expect(rows.nth(1)).toContainText('Сума:');
    await expect(rows.nth(2)).toContainText('Створення');
    await expect(rows.nth(2)).toContainText(description);
    // бухгалтер бачить лише власні дії — колонки й фільтра «Користувач» немає
    await expect(page.getByLabel('Користувач')).toHaveCount(0);
    record(`Для операції № ${created.id} показано 3 записи: «Видалення», «Зміна» (сума 100,00 → 999,00), «Створення»; колонки «Користувач» немає`);
  });

  test('TC-023 Історія дій: адміністратор бачить автора і фільтрує за дією', async ({ page }) => {
    await loginUi(page, 'admin');
    await openPage(page, 'Історія дій');
    await expect(page.getByLabel('Користувач')).toBeVisible();
    await page.getByLabel('Дія').selectOption('update');
    await expect(page.locator('tbody tr').first()).toContainText('Зміна');
    const rows = await page.locator('tbody tr').allInnerTexts();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.includes('Зміна') && !r.includes('Видалення'))).toBe(true);
    await expect(page.locator('tbody tr').first()).toContainText('Олена Коваль');
    record(`Фільтр «Зміна»: ${rows.length} рядків, усі з дією «Зміна»; автор — «Олена Коваль»`);
  });

  test('TC-024 Експорт звіту в Excel (нова стратегія)', async ({ page }) => {
    await loginUi(page, 'accountant');
    await openPage(page, 'Звіти');
    await page.getByRole('button', { name: 'З початку року' }).click();
    const button = page.getByRole('button', { name: 'Експортувати Excel' });
    await expect(button).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toMatch(/^report_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.xls$/);
    const xml = fs.readFileSync(await download.path(), 'utf8');
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect((xml.match(/<Worksheet /g) || []).length).toBe(2);
    expect(xml).toMatch(/<Data ss:Type="Number">\d+\.\d{2}<\/Data>/);
    record(`Завантажено «${download.suggestedFilename()}»: книга SpreadsheetML з 2 аркушами, суми — числові комірки`);
  });
});
