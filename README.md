# Інформаційна система обліку доходів і витрат підприємства

Повний стек: **React + Vite + Tailwind** (frontend) · **Node.js + Express** (backend, REST API) · **PostgreSQL** (база даних).

```
project/
├── frontend/             клієнтська частина (React)
├── backend/              серверна частина (Express, PostgreSQL)
├── db/                   SQL-скрипти для створення баз
└── docker-compose.yml    PostgreSQL у Docker (необов'язково)
```

## Швидкий запуск (Windows / macOS / Linux)

Потрібні: **Node.js 18+** і **PostgreSQL 14+** (або Docker).

### 1. База даних PostgreSQL

**Варіант А — Docker** (найпростіше):

```bash
docker compose up -d
```

**Варіант Б — встановлений PostgreSQL.** Відкрийте `psql` (або SQL Shell) від імені користувача postgres і виконайте вміст файлу `db/create-databases.sql`:

```sql
CREATE USER finance WITH PASSWORD 'finance' CREATEDB;
CREATE DATABASE finance_db OWNER finance;
CREATE DATABASE finance_test OWNER finance;
```

### 2. Backend

```bash
cd backend
copy .env.example .env        # Windows  (macOS/Linux: cp .env.example .env)
npm install
npm run db:setup              # створює таблиці та демо-дані
npm run dev                   # http://localhost:3000/api
```

Перевірка: відкрийте http://localhost:3000/api/health — має бути `{"status":"ok","database":"up"}`.

### 3. Frontend

В **іншому терміналі**:

```bash
cd frontend
copy .env.example .env        # Windows  (macOS/Linux: cp .env.example .env)
npm install
npm run dev                   # http://localhost:5173
```

Файл `.env` із рядком `VITE_API_URL=http://localhost:3000/api` вмикає роботу з реальним сервером. Без нього frontend працює з вбудованим mock-сервером.

### Демо-акаунти

| Роль             | E-mail              | Пароль      |
|------------------|---------------------|-------------|
| Бухгалтер        | accountant@demo.com | demo1234    |
| Адміністратор    | admin@demo.com      | admin1234   |
| Керівник відділу | manager@demo.com    | manager1234 |

## Тестування

```bash
cd backend
npm test
```

76 інтеграційних тестів виконуються на окремій базі `finance_test` (вона повністю перестворюється під час тестів, тому тести відмовляються працювати з будь-якою БД, назва якої не закінчується на `_test`).

Для ручного тестування імпортуйте у Postman файл `backend/postman_collection.json` (29 запитів із автоматичними перевірками). Спершу виконайте запити з папки «1. Автентифікація».

## Типові проблеми

| Симптом | Що робити |
|---|---|
| `Не вдалося підключитися до PostgreSQL` | Запустіть PostgreSQL і перевірте `DATABASE_URL` у `backend/.env` |
| `password authentication failed` | Користувач/пароль у `DATABASE_URL` не збігаються з тими, що створені в БД |
| У браузері помилка CORS | У `backend/.env` значення `CORS_ORIGIN` має збігатися з адресою frontend (за замовчуванням `http://localhost:5173`) |
| Frontend показує демо-дані й не бачить сервер | Перевірте, що існує `frontend/.env` і перезапустіть `npm run dev` |
| Порт 3000 зайнятий | Змініть `PORT` у `backend/.env` і `VITE_API_URL` у `frontend/.env` |
