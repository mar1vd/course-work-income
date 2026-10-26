import { Link } from 'react-router-dom';
import { reportsApi, transactionsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import MonthlyChart from '../components/dashboard/MonthlyChart.jsx';
import CategoryChart from '../components/dashboard/CategoryChart.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Card from '../components/ui/Card.jsx';
import { amountClass, formatDate, formatMoney, monthStartISO, todayISO } from '../utils/format.js';

// Дашборд: показники та графіки за останні 6 місяців + 5 останніх операцій
export default function DashboardPage() {
  const from = monthStartISO(5);
  const to = todayISO();
  // GET /reports/summary?from=&to= — підсумки за період
  const summary = useAsync(() => reportsApi.summary({ from, to }), []);
  // GET /transactions?page=1&limit=5 — останні операції
  const recent = useAsync(() => transactionsApi.list({ page: 1, limit: 5 }), []);

  // стани запиту: завантаження -> помилка -> дані
  if (summary.loading && !summary.data) return <Spinner />;
  if (summary.error) return <ErrorMessage error={summary.error} onRetry={summary.reload} />;
  const s = summary.data;

  return (
    <div>
      <h1 className="text-2xl font-bold 2xl:text-3xl">Дашборд</h1>
      <p className="text-slate-500">
        Показники за останні 6 місяців ({formatDate(from)} — {formatDate(to)})
      </p>

      <div className="my-4 grid gap-4 lg:grid-cols-3">
        <KpiCard title="Доходи" value={formatMoney(s.totalIncome)} tone="income" />
        <KpiCard title="Витрати" value={formatMoney(s.totalExpense)} tone="expense" />
        <KpiCard title="Прибуток" value={formatMoney(s.profit)} tone={s.profit >= 0 ? 'income' : 'expense'} hint={`Операцій: ${s.count}`} />
      </div>

      <div className="my-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Доходи та витрати по місяцях</h2>
          <MonthlyChart byMonth={s.byMonth} from={from} to={to} />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Структура витрат</h2>
          <CategoryChart categories={s.byCategory} />
        </Card>
      </div>

      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Останні операції</h2>
          <Link to="/transactions" className="text-blue-600 hover:underline">
            Усі операції →
          </Link>
        </div>
        {recent.loading && !recent.data && <Spinner />}
        {recent.error && <ErrorMessage error={recent.error} onRetry={recent.reload} />}
        {recent.data && (
          <ul className="divide-y divide-slate-200">
            {recent.data.items.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2.5">
                <span>
                  <strong>{t.categoryName}</strong>
                  <span className="text-slate-500"> · {formatDate(t.date)}</span>
                </span>
                <span className={amountClass(t.type)}>
                  {t.type === 'expense' ? '−' : '+'}
                  {formatMoney(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
