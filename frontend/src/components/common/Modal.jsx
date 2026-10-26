import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Універсальне модальне вікно: закривається клавішею Esc та кліком по затемненню.
// Клавіатурна доступність: фокус не виходить за межі вікна (Tab / Shift+Tab ходять по колу)
// і після закриття повертається на елемент, який відкрив вікно.
export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);
  // елемент, що мав фокус до відкриття вікна (запам'ятовуємо під час першого рендера)
  const openerRef = useRef(document.activeElement);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // забороняємо прокрутку сторінки під вікном і відновлюємо її при закритті
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    // якщо жодне поле не взяло фокус само (autoFocus), переводимо його на саме вікно
    if (!dialog.contains(document.activeElement)) dialog.focus();
    const opener = openerRef.current;
    return () => opener?.focus?.();
  }, []);

  // Пастка фокуса: на останньому елементі Tab переходить до першого, і навпаки
  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-xl bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Закрити" onClick={onClose} className="cursor-pointer text-3xl leading-none text-slate-500 hover:text-slate-800">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
