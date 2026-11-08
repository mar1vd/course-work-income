// Конкретний спостерігач: записує кожну зміну операції в журнал дій (таблиця audit_log).
// Саме на ньому побудовано «Історію дій» — перегляд того, що і коли робив бухгалтер.
import { TransactionObserver } from './TransactionObserver.js';
import * as auditRepository from '../../repositories/audit.repository.js';

// У журнал потрапляють лише змістовні поля операції
const snapshot = (tx) =>
  tx
    ? {
        type: tx.type,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        amount: tx.amount,
        date: tx.date,
        description: tx.description ?? '',
      }
    : null;

export class AuditLogObserver extends TransactionObserver {
  // Репозиторій передається ззовні (Dependency Injection) — у тестах його можна підмінити
  constructor(repository = auditRepository) {
    super();
    this.repository = repository;
  }

  async update({ action, actor, transactionId, before, after }) {
    await this.repository.add({
      userId: actor.id,
      userName: actor.fullName,
      action,
      transactionId,
      before: snapshot(before),
      after: snapshot(after),
    });
  }
}
