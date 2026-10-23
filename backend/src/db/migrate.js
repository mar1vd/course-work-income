// Створення таблиць. Запуск: npm run db:migrate  (з --reset таблиці спершу видаляються)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { closePool, query } from '../config/db.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));

export async function migrate({ reset = false } = {}) {
  if (reset) {
    await query('DROP TABLE IF EXISTS reports, transactions, categories, users CASCADE');
  }
  await query(readFileSync(schemaPath, 'utf8'));
}

// Виконується лише при прямому запуску файлу (node src/db/migrate.js)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const reset = process.argv.includes('--reset');
  migrate({ reset })
    .then(() => console.log(reset ? 'Таблиці перестворено' : 'Міграцію виконано'))
    .catch((error) => {
      console.error('Помилка міграції:', error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
