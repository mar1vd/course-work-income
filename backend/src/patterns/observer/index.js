// Точка складання (composition root): єдиний на застосунок видавець подій про операції
// та перелік підписаних спостерігачів. Щоб додати нову реакцію на зміну операції
// (наприклад, сповіщення про перевищення ліміту витрат — вимога 12 з ЛР № 2),
// достатньо написати новий клас-спостерігач і підписати його тут.
import { TransactionEventPublisher } from './TransactionEventPublisher.js';
import { AuditLogObserver } from './AuditLogObserver.js';

export const transactionEvents = new TransactionEventPublisher();
transactionEvents.subscribe(new AuditLogObserver());

export { TransactionEventPublisher, AuditLogObserver };
export { TransactionObserver } from './TransactionObserver.js';
