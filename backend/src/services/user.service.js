// Бізнес-логіка керування користувачами (доступна лише адміністратору).
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import * as userRepository from '../repositories/user.repository.js';

export const list = () => userRepository.findAll();

async function getOrFail(id) {
  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound('Користувача не знайдено');
  return user;
}

async function assertEmailFree(email, excludeId = null) {
  const existing = await userRepository.findByEmail(email);
  if (existing && existing.id !== excludeId) throw ApiError.conflict('Користувач з таким e-mail уже існує');
}

export async function create({ fullName, email, role, password }) {
  await assertEmailFree(email);
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  return userRepository.create({ fullName, email, role, passwordHash });
}

export async function update(id, { fullName, email, role, password }) {
  const current = await getOrFail(id);
  await assertEmailFree(email, id);

  // Не можна позбавити систему останнього адміністратора
  if (current.role === 'admin' && role !== 'admin' && (await userRepository.countByRole('admin')) <= 1) {
    throw ApiError.conflict('Не можна змінити роль останнього адміністратора');
  }
  const passwordHash = password ? await bcrypt.hash(password, config.bcryptRounds) : null;
  return userRepository.update(id, { fullName, email, role, passwordHash });
}

export async function remove(id, currentUserId) {
  const user = await getOrFail(id);
  if (id === currentUserId) throw ApiError.conflict('Не можна видалити власний обліковий запис');
  if (user.role === 'admin' && (await userRepository.countByRole('admin')) <= 1) {
    throw ApiError.conflict('Не можна видалити останнього адміністратора');
  }
  // Захист фінансових даних: користувача з операціями видаляти не можна
  const count = await userRepository.countTransactions(id);
  if (count > 0) throw ApiError.conflict(`Користувач має операції (${count}), видалення неможливе`);
  await userRepository.remove(id);
}
