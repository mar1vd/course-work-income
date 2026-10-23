import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/index.js';
import { TOKEN_KEY } from '../api/client.js';

const USER_KEY = 'ie_user';
const AuthContext = createContext(null);

// Зберігає поточного користувача та надає login / logout усьому застосунку.
export function AuthProvider({ children }) {
  // Початковий стан відновлюємо з localStorage, щоб сесія переживала оновлення сторінки
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  // POST /auth/login: у разі успіху зберігаємо токен і користувача
  const login = useCallback(async (email, password) => {
    const { token, user: loggedIn } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedIn));
    setUser(loggedIn);
    return loggedIn;
  }, []);

  // Вихід: очищаємо збережені дані
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Якщо API відповів 401 (токен недійсний) — автоматично виходимо
  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,

      // права доступу, від яких залежить, які кнопки бачить користувач
      canEdit: Boolean(user && ['admin', 'accountant'].includes(user.role)),
      isAdmin: user?.role === 'admin',
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
