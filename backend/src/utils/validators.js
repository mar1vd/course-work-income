// Валідація вхідних даних. Виконується на сервері, навіть якщо така ж перевірка є у frontend.
// Функції повертають об'єкт {поле: "повідомлення"}; assertValid кидає HTTP 422, якщо помилки є.
import { ApiError } from './ApiError.js';

export const ROLES = ['admin', 'accountant', 'manager'];
export const TYPES = ['income', 'expense'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValid(details) {
  if (Object.keys(details).length > 0) throw ApiError.unprocessable(details);
}

// Перевірка, що рядок — коректна календарна дата YYYY-MM-DD
export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Найпізніша допустима дата операції: "сьогодні" з запасом в одну добу,
// щоб різниця часових поясів між клієнтом і сервером не давала хибних відмов
function latestAllowedDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Ідентифікатор із URL: додатне ціле число
export function parseId(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 2147483647) {
    throw ApiError.badRequest('Некоректний ідентифікатор');
  }
  return Number(value);
}

export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit };
}

export function validateLogin(body) {
  const details = {};
  if (typeof body.email !== 'string' || !body.email.trim()) details.email = 'Введіть e-mail';
  else if (!EMAIL_RE.test(body.email.trim())) details.email = 'Некоректний формат e-mail';
  if (typeof body.password !== 'string' || !body.password) details.password = 'Введіть пароль';
  assertValid(details);
}

// Повертає очищені дані операції (з перетвореними типами)
export function validateTransaction(body) {
  const details = {};
  if (!TYPES.includes(body.type)) details.type = 'Оберіть тип операції';

  const categoryId = Number(body.categoryId);
  if (!Number.isInteger(categoryId) || categoryId < 1) details.categoryId = 'Оберіть категорію';

  const amount = typeof body.amount === 'string' ? Number(body.amount.replace(',', '.')) : body.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) details.amount = 'Сума має бути додатним числом';
  else if (Number(amount.toFixed(2)) !== amount) details.amount = 'Сума — не більше 2 знаків після коми';
  else if (amount > 9999999999.99) details.amount = 'Сума занадто велика';

  if (!isISODate(body.date)) details.date = 'Вкажіть коректну дату';
  else if (body.date > latestAllowedDate()) details.date = 'Дата не може бути у майбутньому';

  const description = body.description == null ? '' : body.description;
  if (typeof description !== 'string') details.description = 'Опис має бути текстом';
  else if (description.length > 255) details.description = 'Опис — не більше 255 символів';

  assertValid(details);
  return { type: body.type, categoryId, amount, date: body.date, description: description.trim() };
}

export function validateCategory(body) {
  const details = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 100) details.name = 'Назва — від 2 до 100 символів';
  if (!TYPES.includes(body.type)) details.type = 'Оберіть тип категорії';
  assertValid(details);
  return { name, type: body.type };
}

// isCreate = true: пароль обов'язковий; при оновленні — необов'язковий
export function validateUser(body, isCreate) {
  const details = {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (fullName.length < 2 || fullName.length > 150) details.fullName = 'Ім\'я — від 2 до 150 символів';

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 150) details.email = 'Некоректний формат e-mail';

  if (!ROLES.includes(body.role)) details.role = 'Оберіть роль користувача';

  const hasPassword = body.password !== undefined && body.password !== '';
  if (isCreate || hasPassword) {
    // bcrypt обробляє не більше 72 байтів пароля
    if (typeof body.password !== 'string' || body.password.length < 8) details.password = 'Пароль — щонайменше 8 символів';
    else if (Buffer.byteLength(body.password) > 72) details.password = 'Пароль занадто довгий';
  }
  assertValid(details);
  return { fullName, email, role: body.role, password: hasPassword ? body.password : null };
}

// Період звіту: обидві дати необов'язкові, але якщо задані — мають бути коректними
export function validatePeriod(query) {
  const details = {};
  const from = query.from || '1970-01-01';
  const to = query.to || '9999-12-31';
  if (query.from && !isISODate(query.from)) details.from = 'Некоректна дата початку періоду';
  if (query.to && !isISODate(query.to)) details.to = 'Некоректна дата кінця періоду';
  if (!details.from && !details.to && from > to) details.from = 'Початок періоду не може бути пізніше за кінець';
  assertValid(details);
  return { from, to };
}
