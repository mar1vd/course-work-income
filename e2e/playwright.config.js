// Конфігурація функціональних (end-to-end) тестів у браузері Chromium.
// Перед запуском мають працювати backend (порт 3000), frontend (порт 5173) і PostgreSQL з демо-даними (npm run db:setup).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  workers: 1, // тести працюють з однією БД, тому виконуються послідовно
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/results.json' }], ['html', { open: 'never', outputFolder: 'results/html' }]],
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5173',
    viewport: { width: 1366, height: 800 },
    locale: 'uk-UA',
    screenshot: 'only-on-failure',
  },
});
