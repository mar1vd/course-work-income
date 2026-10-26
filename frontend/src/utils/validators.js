// Валідація на клієнті: помилки показуються біля полів ще до відправки на сервер.
// Кожна функція повертає об'єкт {поле: "текст помилки"}; порожній об'єкт = помилок немає.
import { todayISO } from './format.js';

// "1 250,50" -> "1250.50"
const normalizeAmount = (raw) => String(raw).trim().replace(/\s/g, '').replace(',', '.');

export const parseAmount = (raw) => Number(normalizeAmount(raw));

// Перевірка форми операції: тип, категорія, сума (додатна, до 2 знаків), дата не в майбутньому, довжина опису
export function validateTransaction(values) {
  const errors = {};
  if (!values.type) errors.type = 'Оберіть тип операції';
  if (!values.categoryId) errors.categoryId = 'Оберіть категорію';

  const amount = normalizeAmount(values.amount);
  if (!amount) errors.amount = 'Введіть суму';
  else if (!/^\d+(\.\d{1,2})?$/.test(amount)) errors.amount = 'Сума — додатне число, не більше 2 знаків після коми';
  else if (Number(amount) <= 0) errors.amount = 'Сума має бути більшою за 0';
  else if (Number(amount) > 9999999999.99) errors.amount = 'Сума занадто велика';

  if (!values.date) errors.date = 'Вкажіть дату операції';
  else if (values.date > todayISO()) errors.date = 'Дата не може бути у майбутньому';

  if (values.description.length > 255) errors.description = 'Опис — не більше 255 символів';
  return errors;
}

// Перевірка форми категорії
export function validateCategory(values) {
  const errors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = 'Назва має містити щонайменше 2 символи';
  else if (name.length > 100) errors.name = 'Назва — не більше 100 символів';
  if (!values.type) errors.type = 'Оберіть тип категорії';
  return errors;
}

// Перевірка форми входу
export function validateLogin(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Введіть e-mail';
  else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Некоректний формат e-mail';
  if (!values.password) errors.password = 'Введіть пароль';
  else if (values.password.length < 8) errors.password = 'Пароль — щонайменше 8 символів';
  return errors;
}

// Перевірка періоду звіту: повертає текст помилки або порожній рядок
export function validatePeriod(from, to) {
  if (!from || !to) return 'Вкажіть початок і кінець періоду';
  if (from > to) return 'Початок періоду не може бути пізніше за кінець';
  return '';
}
