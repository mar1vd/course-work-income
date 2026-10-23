// Обгортка для асинхронних обробників: будь-яка помилка потрапляє в errorHandler.
export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
