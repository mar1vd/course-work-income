// Бізнес-логіка операцій.
import { ApiError } from '../utils/ApiError.js';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';

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

export async function create(userId, data) {
  await assertCategoryMatches(data.categoryId, data.type);
  return transactionRepository.create(userId, data);
}

export async function update(id, data) {
  if (!(await transactionRepository.findById(id))) throw ApiError.notFound('Операцію не знайдено');
  await assertCategoryMatches(data.categoryId, data.type);
  return transactionRepository.update(id, data);
}

export async function remove(id) {
  const removed = await transactionRepository.remove(id);
  if (!removed) throw ApiError.notFound('Операцію не знайдено');
}
