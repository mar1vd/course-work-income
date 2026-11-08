// Модульні тести патерна Observer (ЛР № 12): видавець подій та спостерігач журналу дій.
// База даних не потрібна — репозиторій журналу підміняється фейковим об'єктом.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransactionEventPublisher } from '../../src/patterns/observer/TransactionEventPublisher.js';
import { TransactionObserver } from '../../src/patterns/observer/TransactionObserver.js';
import { AuditLogObserver } from '../../src/patterns/observer/AuditLogObserver.js';

// Спостерігач-шпигун: запам'ятовує отримані події
class SpyObserver extends TransactionObserver {
  events = [];
  async update(event) {
    this.events.push(event);
  }
}

const silentLogger = () => {
  const errors = [];
  return { errors, error: (...args) => errors.push(args) };
};

const actor = { id: 2, fullName: 'Олена Коваль' };
const tx = { id: 7, type: 'expense', categoryId: 3, categoryName: 'Оренда', amount: 100, date: '2026-10-01', description: 'X', userId: 2 };

describe('Патерн Observer', () => {
  it('OB-01: усі підписані спостерігачі отримують подію', async () => {
    const publisher = new TransactionEventPublisher();
    const a = new SpyObserver();
    const b = new SpyObserver();
    publisher.subscribe(a);
    publisher.subscribe(b);
    await publisher.notify({ action: 'create', actor, transactionId: 7, before: null, after: tx });
    assert.equal(a.events.length, 1);
    assert.equal(b.events.length, 1);
    assert.equal(a.events[0].action, 'create');
    assert.ok(a.events[0].occurredAt, 'подія містить час');
  });

  it('OB-02: повторна підписка не дублює спостерігача, відписаний не отримує подій', async () => {
    const publisher = new TransactionEventPublisher();
    const spy = new SpyObserver();
    publisher.subscribe(spy);
    publisher.subscribe(spy);
    assert.equal(publisher.observerCount, 1);
    publisher.unsubscribe(spy);
    await publisher.notify({ action: 'delete', actor, transactionId: 7, before: tx, after: null });
    assert.equal(spy.events.length, 0);
  });

  it('OB-03: помилка одного спостерігача не заважає іншим і записується в журнал сервера', async () => {
    const logger = silentLogger();
    const publisher = new TransactionEventPublisher({ logger });
    class BrokenObserver extends TransactionObserver {
      async update() {
        throw new Error('збій');
      }
    }
    const spy = new SpyObserver();
    publisher.subscribe(new BrokenObserver());
    publisher.subscribe(spy);
    await publisher.notify({ action: 'update', actor, transactionId: 7, before: tx, after: tx });
    assert.equal(spy.events.length, 1);
    assert.equal(logger.errors.length, 1);
    assert.match(logger.errors[0][0], /BrokenObserver/);
  });

  it('OB-04: подія незмінна — спостерігач не може зіпсувати її для інших', async () => {
    const publisher = new TransactionEventPublisher({ logger: silentLogger() });
    class Mutator extends TransactionObserver {
      async update(event) {
        event.action = 'hacked';
      }
    }
    const spy = new SpyObserver();
    publisher.subscribe(new Mutator());
    publisher.subscribe(spy);
    await publisher.notify({ action: 'create', actor, transactionId: 7, before: null, after: tx });
    assert.equal(spy.events[0].action, 'create');
  });

  it('OB-05: об\'єкт без методу update() підписати не можна; базовий клас вимагає реалізації', async () => {
    const publisher = new TransactionEventPublisher();
    assert.throws(() => publisher.subscribe({}), TypeError);
    await assert.rejects(() => new TransactionObserver().update({}), /update/);
  });

  it('OB-06: AuditLogObserver формує запис журналу зі знімками «до» і «після»', async () => {
    const saved = [];
    const observer = new AuditLogObserver({ add: async (entry) => saved.push(entry) });
    const after = { ...tx, amount: 250 };
    await observer.update({ action: 'update', actor, transactionId: 7, before: tx, after });
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0], {
      userId: 2,
      userName: 'Олена Коваль',
      action: 'update',
      transactionId: 7,
      before: { type: 'expense', categoryId: 3, categoryName: 'Оренда', amount: 100, date: '2026-10-01', description: 'X' },
      after: { type: 'expense', categoryId: 3, categoryName: 'Оренда', amount: 250, date: '2026-10-01', description: 'X' },
    });
  });
});
