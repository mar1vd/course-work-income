// Помилка, яку сервер перетворює на HTTP-відповідь із потрібним статусом.
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details; // помилки по полях для HTTP 422
  }

  static badRequest(message = 'Некоректний запит') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Потрібна авторизація. Увійдіть у систему.') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Недостатньо прав для виконання цієї дії') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Ресурс не знайдено') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static unprocessable(details, message = 'Перевірте правильність заповнення форми') {
    return new ApiError(422, message, details);
  }
}
