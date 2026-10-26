// Конфігурація застосунку. Значення беруться зі змінних середовища (файл .env).
import 'dotenv/config';

const env = process.env.NODE_ENV || 'development';

// У робочому середовищі секрет JWT обов'язково має бути заданий вручну
if (env === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Змінна JWT_SECRET обов\'язкова у production-середовищі');
}

export const config = {
  env,
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://finance:finance@localhost:5432/finance_db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Список дозволених джерел запитів (адреси фронтенду) через кому
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  // Максимальна кількість спроб входу з однієї IP-адреси за 15 хвилин
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
  // Часовий пояс підприємства: за ним визначається, що таке «сьогодні» при перевірці дати операції
  timezone: process.env.BUSINESS_TIMEZONE || 'Europe/Kiev',
  // Складність хешування паролів (у тестах знижено для швидкості)
  bcryptRounds: env === 'test' ? 4 : 10,
};
