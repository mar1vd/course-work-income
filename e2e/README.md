# Функціональні тести (Playwright)

Автоматизовані тести в браузері Chromium: 21 функціональний тест-кейс (`TC-001` … `TC-021`: 10 позитивних і 11 негативних)
та 4 регресійні тести виправлених дефектів (`RT-D01` … `RT-D04`).

## Підготовка

Мають бути запущені PostgreSQL, **backend** і **frontend** із демонстраційними даними.

1. У `backend/.env` тимчасово збільште ліміт спроб входу — тести виконують багато входів поспіль, а за замовчуванням дозволено 20 за 15 хвилин:

   ```
   LOGIN_RATE_LIMIT=10000
   ```

2. Запустіть систему (див. `../README.md`):

   ```bash
   cd backend  && npm run db:setup && npm run dev
   cd frontend && npm run dev
   ```

3. Встановіть залежності та браузер:

   ```bash
   cd e2e
   npm install
   npx playwright install chromium
   ```

## Запуск

```bash
npm test            # усі тести
npx playwright test tests/regression.spec.js    # лише регресійні
npm run report      # HTML-звіт останнього запуску
```

Інша адреса застосунку: `APP_URL=http://localhost:5173`, API: `API_URL=http://localhost:3000/api`.

> Тести створюють власні дані з унікальними описами та видаляють їх після виконання. Для чистого старту виконайте `npm run db:setup` у `backend`.
