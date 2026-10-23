import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

// Короткі сповіщення про результат дії («Операцію додано») — видимість стану системи
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // Додає сповіщення і автоматично прибирає його через 4 секунди
  const push = useCallback(
    (type, message) => {
      const id = ++counter.current;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="fixed right-4 bottom-4 left-4 z-[60] flex flex-col gap-2 sm:left-auto">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 text-white shadow-lg ${t.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
            <span>{t.message}</span>
            <button type="button" aria-label="Закрити сповіщення" onClick={() => dismiss(t.id)} className="cursor-pointer text-xl leading-none">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
