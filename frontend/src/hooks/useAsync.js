// Хук для асинхронних запитів: керує станами loading / error / data.
// fn — функція, що повертає Promise; deps — залежності, при зміні яких запит виконується повторно.
// Захист від «гонок»: якщо відповідь на старий запит прийшла після нового — вона ігнорується.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  // номер останнього запиту
  const requestId = useRef(0);

  // Виконує запит і оновлює стан
  const run = useCallback(async () => {
    const id = ++requestId.current;

    // попередні дані лишаємо, щоб таблиця не «блимала» під час оновлення
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // сам виклик API
      const data = await fn();
      if (id === requestId.current) setState({ loading: false, error: null, data });
    } catch (error) {
      if (id === requestId.current) setState({ loading: false, error, data: null });
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  // reload дозволяє повторити запит (кнопка «Повторити спробу»)
  return { ...state, reload: run };
}
