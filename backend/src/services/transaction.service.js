// Бізнес-логіка операцій.
// ЛР № 12: після кожної успішної зміни сервіс публікує подію (патерн Observer).
// Сервіс не знає, хто на подію реагує: журнал дій, сповіщення чи інші компоненти
// підключаються до видавця transactionEvents окремо (src/patterns/observer/index.js).
import { ApiError } from '../utils/ApiError.js';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';
import { transactionEvents } from '../patterns/observer/index.js';

export async function list(filters) {
  const { items, total } = await transactionRepository.findPage(filters);
  return { items, total, page: filters.page, limit: filters.limit };
}

// Перевірка зв'язків між даними: категорія існує і відповідає типу операції
async function assertCategoryMatches(categoryId, type) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) throw ApiError.unprocessable({ categoryId: 'Категорію не знайдено' });
  if (category.type !== type) throw ApiError.unprocessable({ categoryId: 'Категорія не відповідає типу операції' });
}

async function getOrFail(id) {
  const transaction = await transactionRepository.findById(id);
  if (!transaction) throw ApiError.notFound('Операцію не знайдено');
  return transaction;
}

// actor — користувач, який виконує дію ({ id, fullName, ... } з req.user)
export async function create(actor, data) {
  await assertCategoryMatches(data.categoryId, data.type);
  const created = await transactionRepository.create(actor.id, data);
  await transactionEvents.notify({ action: 'create', actor, transactionId: created.id, before: null, after: created });
  return created;
}

export async function update(actor, id, data) {
  const before = await getOrFail(id);
  await assertCategoryMatches(data.categoryId, data.type);
  const updated = await transactionRepository.update(id, data);
  await transactionEvents.notify({ action: 'update', actor, transactionId: id, before, after: updated });
  return updated;
}

export async function remove(actor, id) {
  const before = await getOrFail(id);
  const removed = await transactionRepository.remove(id);
  if (!removed) throw ApiError.notFound('Операцію не знайдено'); // видалили паралельно між читанням і DELETE
  await transactionEvents.notify({ action: 'delete', actor, transactionId: id, before, after: null });
}
