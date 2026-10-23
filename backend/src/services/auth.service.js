// Сервіс автентифікації: перевірка пароля та випуск JWT-токена.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import * as userRepository from '../repositories/user.repository.js';

// Фіктивний хеш: якщо користувача не існує, ми все одно виконуємо порівняння,
// щоб час відповіді не видавав, чи є такий e-mail у системі
const DUMMY_HASH = bcrypt.hashSync('dummy-password', config.bcryptRounds);

export const publicUser = ({ id, fullName, email, role }) => ({ id, fullName, email, role });

export async function login(email, password) {
  const user = await userRepository.findByEmail(email.trim().toLowerCase());
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // Однакове повідомлення для неіснуючого e-mail і хибного пароля
  if (!user || !passwordOk) throw ApiError.unauthorized('Невірний e-mail або пароль');

  // У токені лише ідентифікатор користувача; роль щоразу береться з БД (див. middleware/auth.js)
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return { token, user: publicUser(user) };
}
