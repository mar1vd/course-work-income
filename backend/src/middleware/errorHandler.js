// Централізована обробка помилок: усі відповіді мають єдиний формат { status, message, details? }.
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

// Для маршрутів, яких не існує
export const notFoundHandler = (req, res, next) => next(ApiError.notFound('Ресурс не знайдено'));

// Перетворює помилки драйвера PostgreSQL та парсера JSON на зрозумілі HTTP-статуси
function normalize(error) {
  if (error instanceof ApiError) return error;
  if (error.type === 'entity.parse.failed') return ApiError.badRequest('Некоректний JSON у тілі запиту');
  if (error.type === 'entity.too.large') return new ApiError(413, 'Тіло запиту занадто велике');
  if (error.code === '23505') return ApiError.conflict('Запис з такими даними вже існує');
  if (error.code === '23503') return ApiError.conflict('Запис пов\'язаний з іншими даними');
  if (error.code === '22P02' || error.code === '22003') return ApiError.badRequest('Некоректні дані у запиті');
  return new ApiError(500, 'Внутрішня помилка сервера');
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const apiError = normalize(error);
  if (apiError.status >= 500 && config.env !== 'test') {
    // Деталі 5xx-помилок записуємо лише в журнал, клієнту їх не показуємо
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  }
  const body = { status: apiError.status, message: apiError.message };
  if (apiError.details) body.details = apiError.details;
  res.status(apiError.status).json(body);
}
