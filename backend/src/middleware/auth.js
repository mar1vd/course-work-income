// Автентифікація (хто це?) та авторизація (що йому дозволено?).
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as userRepository from '../repositories/user.repository.js';

// Перевіряє заголовок "Authorization: Bearer <token>" і записує користувача в req.user
export const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Сесія закінчилась або токен недійсний. Увійдіть знову.');
  }

  // Користувача й роль беремо з бази: якщо його видалили або змінили роль, зміни діють одразу
  const user = await userRepository.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Користувача не знайдено. Увійдіть знову.');
  req.user = user;
  next();
});

// Дозволяє доступ лише переліченим ролям: authorize('admin', 'accountant')
export const authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : next(ApiError.forbidden());
