// Бізнес-логіка перегляду журналу дій.
// Правило доступу: адміністратор і керівник відділу бачать дії всіх користувачів,
// бухгалтер — лише власні (навіть якщо в запиті вказав чужий userId).
import * as auditRepository from '../repositories/audit.repository.js';

export const canSeeEveryone = (user) => user.role === 'admin' || user.role === 'manager';

export async function list(currentUser, filters) {
  const userId = canSeeEveryone(currentUser) ? filters.userId : currentUser.id;
  const { items, total } = await auditRepository.findPage({ ...filters, userId });
  const actors = await auditRepository.findActors(canSeeEveryone(currentUser) ? null : currentUser.id);
  return { items, total, page: filters.page, limit: filters.limit, actors };
}
