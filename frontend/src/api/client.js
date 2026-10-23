import { ApiError } from './ApiError.js';
import { mockRequest } from './mockServer.js';

// Якщо задано VITE_API_URL — запити йдуть на реальний бекенд через fetch,
// інакше використовується вбудований mock-сервер (localStorage).
const BASE_URL = import.meta.env.VITE_API_URL;
const NETWORK_ERROR_TEXT =
  'Не вдалося завантажити дані. Перевірте підключення до Інтернету та повторіть спробу.';

export const TOKEN_KEY = 'ie_token';

// Перетворює об'єкт параметрів на рядок запиту, пропускаючи порожні значення
function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

// Запит до реального REST API
async function realRequest(method, url, body, token) {
  let response;
  try {
    response = await fetch(BASE_URL + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  // fetch кидає виняток лише при мережевих збоях
  } catch {
    throw new ApiError(NETWORK_ERROR_TEXT, 0);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || `Помилка сервера (${response.status})`, response.status, data?.details);
  }
  return data;
}

// Базова функція: обирає реальний або mock-сервер і обробляє 401 (сесія закінчилась)
export async function request(method, url, { params, body } = {}) {
  const fullUrl = url + buildQuery(params);
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    return BASE_URL
      ? await realRequest(method, fullUrl, body, token)
      : await mockRequest(method, fullUrl, body, token);
  } catch (error) {
    if (error.status === 401 && !url.startsWith('/auth/login')) {
      // AuthContext слухає цю подію і виконує вихід користувача
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw error;
  }
}

// Короткі методи для зручного використання в src/api/index.js
export const api = {
  get: (url, params) => request('GET', url, { params }),
  post: (url, body) => request('POST', url, { body }),
  put: (url, body) => request('PUT', url, { body }),
  delete: (url) => request('DELETE', url),
};
