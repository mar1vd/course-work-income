// Тонкі обгортки над REST-ендпоінтами — компоненти не знають про URL
import { api } from './client.js';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const transactionsApi = {
  list: (params) => api.get('/transactions', params),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  remove: (id) => api.delete(`/transactions/${id}`),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const reportsApi = {
  summary: (params) => api.get('/reports/summary', params),
};
