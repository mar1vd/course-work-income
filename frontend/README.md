# Фінансовий облік — фронтенд (React + Vite)

Клієнтська частина інформаційної системи обліку доходів і витрат підприємства
(лабораторна робота № 6–7). Стек: React 18, Vite, React Router, Chart.js, Tailwind CSS 4. Працює одразу «з коробки» — із вбудованим mock-сервером,
тому бекенд для запуску не потрібен.

## Запуск (Windows / macOS / Linux)

Потрібен Node.js 18+ (https://nodejs.org).

```bash
npm install
npm run dev
```

Відкрийте http://localhost:5173

## Демо-акаунти

| Роль             | E-mail              | Пароль      | Можливості                                   |
|------------------|---------------------|-------------|----------------------------------------------|
| Бухгалтер        | accountant@demo.com | demo1234    | Операції: перегляд, додавання, редагування   |
| Адміністратор    | admin@demo.com      | admin1234   | Усе + керування категоріями                  |
| Керівник відділу | manager@demo.com    | manager1234 | Лише перегляд                                |

## Корисне для демонстрації та скріншотів

* Скинути дані до початкових: у консолі браузера (F12) — `localStorage.removeItem('ie_mock_db_v1'); location.reload()`
* Змоделювати відсутність мережі (для скріншота повідомлення про помилку):
  `localStorage.setItem('ie_mock_offline', '1')` → оновіть список;
  вимкнути — `localStorage.removeItem('ie_mock_offline')`
* Мобільна версія: F12 → Ctrl+Shift+M (режим пристроїв) → оберіть, напр., iPhone 12 (390 px).

## Підключення реального бекенду

Скопіюйте `.env.example` у `.env` (або створіть файл) і вкажіть адресу API:

```
VITE_API_URL=http://localhost:3000/api
```

Тоді замість mock-сервера запити підуть через `fetch` на ендпоінти бекенду (див. `../backend`):

| Метод  | URL                         | Призначення                              |
|--------|-----------------------------|------------------------------------------|
| POST   | /auth/login                 | Вхід → `{ token, user }`                 |
| GET    | /transactions               | Список (`type, categoryId, from, to, q, page, limit`) → `{ items, total }` |
| POST   | /transactions               | Створення операції                       |
| PUT    | /transactions/:id           | Редагування                              |
| DELETE | /transactions/:id           | Видалення                                |
| GET    | /categories                 | Список категорій                         |
| POST/PUT/DELETE | /categories(/:id)  | Керування категоріями (admin)            |
| GET    | /reports/summary            | Підсумки за період (`from, to`)          |

Помилки валідації очікуються як HTTP 422 з тілом `{ "message": "...", "details": { "поле": "текст" } }`.

## Збірка

```bash
npm run build     # результат у dist/
npm run preview   # перегляд зібраної версії
```
