// Єдиний тип помилок для всіх викликів API (і реального сервера, і mock-сервера).
// status = 0 означає, що відповіді від сервера взагалі не було (проблеми з мережею).


export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // об'єкт {поле: "повідомлення"} для помилок валідації (HTTP 422)
    this.details = details;
  }
}
