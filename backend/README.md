# Backend — REST API обліку доходів і витрат

Node.js · Express 4 · PostgreSQL · JWT · bcrypt

## Архітектура

```
HTTP-запит → middleware (helmet, cors, json, morgan) → routes → authenticate / authorize
           → controller → service → repository → PostgreSQL
```

| Шар | Каталог | Відповідальність |
|---|---|---|
| Routes | `src/routes` | Таблиця маршрутів, ролі, обмеження входу |
| Controller | `src/controllers` | Приймає запит, валідує дані, викликає сервіс, формує відповідь |
| Service | `src/services` | Бізнес-правила |
| Repository | `src/repositories` | SQL-запити (лише з параметрами) |
| Middleware | `src/middleware` | Автентифікація, авторизація, обробка помилок |

## Команди

| Команда | Дія |
|---|---|
| `npm run dev` | Запуск із автоперезавантаженням |
| `npm start` | Запуск |
| `npm run db:migrate` | Створити таблиці |
| `npm run db:seed` | Заповнити демо-даними |
| `npm run db:setup` | Перестворити таблиці та заповнити (видаляє наявні дані!) |
| `npm test` | Усі тести: unit + інтеграційні + API (на БД `finance_test`) |
| `npm run test:unit` | Лише модульні тести (БД не потрібна) |
| `npm run test:integration` | Лише інтеграційні тести сервер ↔ БД |
| `npm run test:api` | Лише тести HTTP API |

## Змінні середовища (`.env`, зразок — `.env.example`)

| Змінна | Призначення |
|---|---|
| `PORT` | Порт сервера (3000) |
| `DATABASE_URL` | Рядок підключення до робочої БД |
| `TEST_DATABASE_URL` | Рядок підключення до тестової БД (назва має закінчуватись на `_test`) |
| `JWT_SECRET` | Секрет підпису токенів (у production задайте довгий випадковий рядок) |
| `JWT_EXPIRES_IN` | Строк дії токена (8h) |
| `CORS_ORIGIN` | Дозволені адреси frontend через кому |
| `BUSINESS_TIMEZONE` | Часовий пояс підприємства для перевірки «дата не з майбутнього» (Europe/Kiev) |
| `LOGIN_RATE_LIMIT` | Ліміт спроб входу за 15 хв з однієї IP-адреси |

## API

Базова адреса: `http://localhost:3000/api`. Захищені маршрути вимагають заголовок `Authorization: Bearer <token>`.

| Метод | URL | Ролі | Успіх | Призначення |
|---|---|---|---|---|
| GET | `/health` | — | 200 | Стан сервера та БД |
| POST | `/auth/login` | — | 200 | Вхід → `{ token, user }` |
| GET | `/auth/me` | усі | 200 | Поточний користувач |
| GET | `/transactions` | усі | 200 | Список: `type, categoryId, from, to, q, page, limit` → `{ items, total, page, limit }` |
| POST | `/transactions` | admin, accountant | 201 | Створити операцію |
| PUT | `/transactions/:id` | admin, accountant | 200 | Змінити операцію |
| DELETE | `/transactions/:id` | admin, accountant | 204 | Видалити операцію |
| GET | `/categories` | усі | 200 | Категорії з кількістю операцій |
| POST | `/categories` | admin | 201 | Створити категорію |
| PUT | `/categories/:id` | admin | 200 | Змінити категорію |
| DELETE | `/categories/:id` | admin | 204 | Видалити (409, якщо використана) |
| GET | `/reports/summary` | усі | 200 | Підсумки за період `from, to` |
| POST | `/reports` | admin, accountant | 201 | Зберегти знімок звіту |
| GET | `/reports` | усі | 200 | Історія збережених звітів користувача |
| GET | `/users` | admin | 200 | Список користувачів |
| POST | `/users` | admin | 201 | Створити користувача |
| PUT | `/users/:id` | admin | 200 | Змінити користувача |
| DELETE | `/users/:id` | admin | 204 | Видалити користувача |

### Формат помилок

```json
{ "status": 422, "message": "Перевірте правильність заповнення форми", "details": { "amount": "Сума має бути додатним числом" } }
```

Коди: 400 некоректний запит · 401 потрібна автентифікація · 403 недостатньо прав · 404 не знайдено · 409 конфлікт даних · 422 помилки валідації · 429 забагато спроб входу · 500 внутрішня помилка.
