// Бізнес-логіка категорій.
import { ApiError } from '../utils/ApiError.js';
import * as categoryRepository from '../repositories/category.repository.js';

export const list = () => categoryRepository.findAll();

async function getOrFail(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Категорію не знайдено');
  return category;
}

// Бізнес-правило: назва категорії унікальна в межах типу (дохід / витрата)
async function assertUnique(name, type, excludeId = null) {
  if (await categoryRepository.findDuplicate(name, type, excludeId)) {
    throw ApiError.unprocessable({ name: 'Така категорія вже існує' });
  }
}

export async function create(data) {
  await assertUnique(data.name, data.type);
  return categoryRepository.create(data);
}

export async function update(id, data) {
  const current = await getOrFail(id);
  // Не дозволяємо змінювати тип категорії, яка вже використана в операціях
  if (current.type !== data.type && current.transactionsCount > 0) {
    throw ApiError.conflict(`Тип категорії змінити неможливо: вона використана в операціях (${current.transactionsCount})`);
  }
  await assertUnique(data.name, data.type, id);
  return categoryRepository.update(id, data);
}

export async function remove(id) {
  const category = await getOrFail(id);
  // Категорію, що використовується в операціях, видаляти не можна
  if (category.transactionsCount > 0) {
    throw ApiError.conflict(`Категорію використано в операціях (${category.transactionsCount}), видалення неможливе`);
  }
  await categoryRepository.remove(id);
}
