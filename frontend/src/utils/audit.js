// Допоміжні функції сторінки «Історія дій» (чисті функції — покриті unit-тестами).
import { TYPE_LABELS, formatDate, formatMoney } from './format.js';

export const ACTION_LABELS = { create: 'Створення', update: 'Зміна', delete: 'Видалення' };

// Поля операції, які показуються в історії, і спосіб їх відображення
const FIELDS = [
  ['type', 'Тип', (v) => TYPE_LABELS[v] ?? v],
  ['categoryName', 'Категорія', (v) => v],
  ['amount', 'Сума', (v) => formatMoney(v)],
  ['date', 'Дата', (v) => formatDate(v)],
  ['description', 'Опис', (v) => v || '—'],
];

// Для зміни — лише поля, що змінились: [{ label, from, to }]
export function changedFields(before, after) {
  if (!before || !after) return [];
  return FIELDS.filter(([key]) => before[key] !== after[key]).map(([key, label, show]) => ({
    label,
    from: show(before[key]),
    to: show(after[key]),
  }));
}

// Короткий опис операції для створення / видалення: «Витрата, Оренда, 1 250,50 грн, 25.10.2026»
export function describeTransaction(tx) {
  if (!tx) return '—';
  const parts = [TYPE_LABELS[tx.type], tx.categoryName, formatMoney(tx.amount), formatDate(tx.date)];
  return parts.join(', ') + (tx.description ? ` — «${tx.description}»` : '');
}

// "2026-11-08T13:05:00.000Z" -> "08.11.2026, 15:05" (за часом браузера)
export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
