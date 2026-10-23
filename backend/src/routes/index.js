// Таблиця маршрутів API. Тут же визначається, які ролі мають доступ до кожного ендпоінта.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { query } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as auth from '../controllers/auth.controller.js';
import * as transactions from '../controllers/transaction.controller.js';
import * as categories from '../controllers/category.controller.js';
import * as reports from '../controllers/report.controller.js';
import * as users from '../controllers/user.controller.js';

const router = Router();
const handle = asyncHandler;

// Обмеження кількості спроб входу (захист від підбору пароля)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Забагато спроб входу. Спробуйте пізніше.' },
});

// Перевірка працездатності сервера та з'єднання з БД
router.get(
  '/health',
  handle(async (req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  })
);

// --- Автентифікація ---
router.post('/auth/login', loginLimiter, handle(auth.login));
router.get('/auth/me', authenticate, auth.me);

// Усі маршрути нижче вимагають входу в систему
router.use(authenticate);

const canEdit = authorize('admin', 'accountant');
const adminOnly = authorize('admin');

// --- Операції: перегляд — усі ролі, зміна — admin та accountant ---
router.get('/transactions', handle(transactions.list));
router.post('/transactions', canEdit, handle(transactions.create));
router.put('/transactions/:id', canEdit, handle(transactions.update));
router.delete('/transactions/:id', canEdit, handle(transactions.remove));

// --- Категорії: перегляд — усі, зміна — лише admin ---
router.get('/categories', handle(categories.list));
router.post('/categories', adminOnly, handle(categories.create));
router.put('/categories/:id', adminOnly, handle(categories.update));
router.delete('/categories/:id', adminOnly, handle(categories.remove));

// --- Звіти ---
router.get('/reports/summary', handle(reports.summary));
router.get('/reports', handle(reports.history));
router.post('/reports', canEdit, handle(reports.save));

// --- Користувачі: лише admin ---
router.get('/users', adminOnly, handle(users.list));
router.post('/users', adminOnly, handle(users.create));
router.put('/users/:id', adminOnly, handle(users.update));
router.delete('/users/:id', adminOnly, handle(users.remove));

export default router;
