// Форматування значень для відображення користувачу (українська локаль)


const moneyFormatter = new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' });

export const formatMoney = (value) => moneyFormatter.format(value);

// "2026-09-05" -> "05.09.2026"
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

const pad = (n) => String(n).padStart(2, '0');

// Дата у форматі YYYY-MM-DD за локальним часом (для <input type="date">)
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

// Перший день місяця, зсунутого на n місяців назад
export function monthStartISO(monthsAgo = 0) {
  const now = new Date();
  return toISO(new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1));
}

// "2026-09" -> "вер. 2026"
export function monthLabel(yyyymm) {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' });
}

export const ROLE_LABELS = {
  admin: 'Адміністратор',
  accountant: 'Бухгалтер',
  manager: 'Керівник відділу',
};

export const TYPE_LABELS = { income: 'Дохід', expense: 'Витрата' };

// Клас кольору суми: зелений — дохід, червоний — витрата
export const amountClass = (type) => (type === 'income' ? 'font-semibold text-green-700' : 'font-semibold text-red-700');

// Усі місяці від початку періоду до кінця у форматі "YYYY-MM": ["2026-05", "2026-06", ...]
export function monthsBetween(from, to) {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  const result = [];
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return result;
}

// Доповнює дані по місяцях нулями там, де операцій не було: вісь графіка залишається безперервною
export function fillMonths(byMonth, from, to) {
  const known = new Map(byMonth.map((m) => [m.month, m]));
  return monthsBetween(from, to).map((month) => known.get(month) ?? { month, income: 0, expense: 0 });
}
