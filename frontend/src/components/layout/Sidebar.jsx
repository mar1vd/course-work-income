import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/transactions', label: 'Операції' },
  { to: '/categories', label: 'Категорії' },
  { to: '/reports', label: 'Звіти' },
];

// Бічне меню. До 1024 px — висувне (клас translate), від 1024 px — постійне
export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-56 shrink-0 border-r border-slate-200 bg-white p-3 transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none lg:transition-none ${
          open ? 'translate-x-0 shadow-lg' : '-translate-x-full'
        }`}
      >
        <nav aria-label="Основна навігація" className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-medium ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-800 hover:bg-slate-100'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div onClick={onClose} className="fixed inset-x-0 top-14 bottom-0 z-30 bg-gray-900/35 lg:hidden" />}
    </>
  );
}
