import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABELS } from '../../utils/format.js';
import Button from '../ui/Button.jsx';

// Шапка: логотип, кнопка-«бургер» (лише на вузьких екранах), інформація про користувача та вихід
export default function Header({ menuOpen, onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Явний вихід: переходимо на чисту сторінку входу (без запам'ятовування попередньої сторінки)
  const handleLogout = () => {
    navigate('/login', { replace: true });
    logout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Відкрити меню"
          aria-expanded={menuOpen}
          onClick={onMenuToggle}
          className="flex cursor-pointer flex-col gap-1 p-2 lg:hidden"
        >
          <span className="block h-0.5 w-5 bg-slate-800" />
          <span className="block h-0.5 w-5 bg-slate-800" />
          <span className="block h-0.5 w-5 bg-slate-800" />
        </button>
        <div className="text-lg font-bold text-blue-600">Фінансовий облік</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden font-medium md:inline">{user.fullName}</span>
        <span className="hidden rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-800 sm:inline">{ROLE_LABELS[user.role]}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Вийти
        </Button>
      </div>
    </header>
  );
}
