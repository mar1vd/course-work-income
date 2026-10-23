// Контролери лише приймають HTTP-запит, викликають сервіс і формують відповідь.
import * as authService from '../services/auth.service.js';
import { validateLogin } from '../utils/validators.js';

export async function login(req, res) {
  validateLogin(req.body);
  res.json(await authService.login(req.body.email, req.body.password));
}

// Дані поточного користувача (за токеном)
export function me(req, res) {
  res.json(authService.publicUser(req.user));
}
