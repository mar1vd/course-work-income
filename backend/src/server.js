// Точка входу: запуск HTTP-сервера.
import { createApp } from './app.js';
import { config } from './config/env.js';
import { closePool, query } from './config/db.js';

const app = createApp();

try {
  await query('SELECT 1'); // перевіряємо підключення до БД ще до початку прийому запитів
} catch (error) {
  console.error('Не вдалося підключитися до PostgreSQL:', error.message);
  console.error('Перевірте DATABASE_URL у файлі .env та чи запущено PostgreSQL.');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`Сервер запущено: http://localhost:${config.port}/api  (середовище: ${config.env})`);
});

// Коректне завершення роботи: закриваємо сервер і з'єднання з БД
const shutdown = () => server.close(() => closePool().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
