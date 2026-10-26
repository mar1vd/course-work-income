// Регресійні (повторні) тести виправлених дефектів D-01 … D-04.
// На збірці ДО виправлень ці тести падають, на виправленій — проходять.
import { test, expect } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:3000/api';
const record = (text) => test.info().annotations.push({ type: 'actual', description: text });
const countRequests = (page, method, part) => {
  const counter = { n: 0 };
  page.on('request', (r) => {
    if (r.method() === method && r.url().includes(part)) counter.n++;
  });
  return counter;
};

async function loginUi(page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('accountant@demo.com');
  await page.getByLabel('Пароль').fill('demo1234');
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('heading', { name: 'Дашборд', level: 1 })).toBeVisible();
}

test.describe('Регресійні тести виправлених дефектів', () => {
  test('RT-D01 API відхиляє завтрашню дату операції', async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, { data: { email: 'accountant@demo.com', password: 'demo1234' } });
    const token = (await login.json()).token;
    const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kiev' }).format(new Date(Date.now() + 864e5));
    const res = await request.post(`${API}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: 'expense', categoryId: 6, amount: 5, date: tomorrow, description: 'RT-D01' },
    });
    const body = await res.json();
    record(`POST /transactions із датою ${tomorrow} (завтра) → HTTP ${res.status()}${res.status() === 422 ? `: «${body.details.date}»` : ' (операцію створено)'}`);
    if (res.status() === 201) await request.delete(`${API}/transactions/${body.id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(422);
  });

  test('RT-D02 Діаграма показує місяці без операцій', async ({ page }) => {
    // Імітуємо відповідь сервера, у якій немає одного з місяців (як при відсутності операцій за цей місяць)
    let removed = '';
    await page.route('**/api/reports/summary*', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      removed = data.byMonth[2].month;
      data.byMonth.splice(2, 1);
      await route.fulfill({ response, json: data });
    });
    await loginUi(page);
    const label = await page.locator('canvas').first().getAttribute('aria-label');
    const months = (label ?? '').replace(/^.*?:\s*/, '').split(', ').filter(Boolean);
    record(`Сервер не повернув місяць ${removed}; на діаграмі підписів по осі X: ${months.length || 'невідомо (діаграма без опису)'}`);
    expect(months).toHaveLength(6);
  });

  test('RT-D03 Фокус не виходить за межі модального вікна і повертається після закриття', async ({ page }) => {
    await loginUi(page);
    await page.getByRole('link', { name: 'Операції', exact: true }).click();
    const opener = page.getByRole('button', { name: '+ Додати операцію' });
    await expect(opener).toBeEnabled();
    await opener.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    let escaped = 0;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(() => document.activeElement.closest('[role="dialog"]') !== null))) escaped++;
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const returned = await page.evaluate(() => document.activeElement?.textContent?.includes('Додати операцію') ?? false);
    record(`15 натискань Tab: фокус виходив за межі вікна ${escaped} разів; після Esc фокус ${returned ? 'повернувся на кнопку «+ Додати операцію»' : 'не повернувся на кнопку, що відкрила вікно'}`);
    expect(escaped).toBe(0);
    expect(returned).toBe(true);
  });

  test('RT-D04 Клієнт перевіряє верхню межу суми', async ({ page }) => {
    const calls = countRequests(page, 'POST', '/transactions');
    await loginUi(page);
    await page.getByRole('link', { name: 'Операції', exact: true }).click();
    await page.getByRole('button', { name: '+ Додати операцію' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Категорія').selectOption({ label: 'Реклама' });
    await dialog.getByLabel('Сума, ₴').fill('12345678901');
    await dialog.getByRole('button', { name: 'Додати операцію' }).click();
    await page.waitForTimeout(800);
    const shown = (await dialog.locator('p.text-red-600').allInnerTexts()).join('; ');
    record(`Сума 12345678901: повідомлення під полем «${shown}»; запитів POST /transactions до сервера: ${calls.n}`);
    expect(shown).toContain('Сума занадто велика');
    expect(calls.n).toBe(0);
  });
});
