import { useState } from 'react';
import { auditApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import Pagination from '../components/common/Pagination.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Field from '../components/ui/Field.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Input, Select } from '../components/ui/Controls.jsx';
import { ACTION_LABELS, changedFields, describeTransaction, formatDateTime } from '../utils/audit.js';

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { action: '', userId: '', from: '', to: '' };
const half = 'basis-[calc(50%-0.375rem)] sm:basis-auto';

// Ті самі класи, що й у таблиці операцій: до 768 px рядки стають картками
const th = 'px-2.5 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase';
const td =
  'flex justify-between gap-4 border-b border-slate-100 py-1.5 text-right last:border-b-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] md:table-cell md:border-b-0 md:px-2.5 md:py-2.5 md:align-top md:before:hidden';

const BADGE = {
  create: 'bg-green-50 text-green-800 ring-green-600/20',
  update: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  delete: 'bg-red-50 text-red-800 ring-red-600/20',
};

function ActionBadge({ action }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE[action]}`}>
      {ACTION_LABELS[action]}
    </span>
  );
}

// Що саме змінилось: для зміни — «було → стало» по полях, для створення / видалення — опис операції
function Details({ entry }) {
  if (entry.action !== 'update') {
    return <span className={entry.action === 'delete' ? 'text-slate-500 line-through' : ''}>{describeTransaction(entry.after ?? entry.before)}</span>;
  }
  const changes = changedFields(entry.before, entry.after);
  if (changes.length === 0) return <span className="text-slate-500">Збережено без змін</span>;
  return (
    <ul className="space-y-0.5">
      {changes.map((c) => (
        <li key={c.label}>
          <span className="text-slate-500">{c.label}:</span> <span className="text-slate-500 line-through">{c.from}</span>{' '}
          <span aria-label="змінено на">→</span> <span className="font-medium">{c.to}</span>
        </li>
      ))}
    </ul>
  );
}

// Сторінка «Історія дій» (ЛР № 12): хто, коли і що робив з операціями.
// Записи формує спостерігач AuditLogObserver на сервері (патерн Observer).
export default function HistoryPage() {
  const { canSeeAllHistory } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;

  // GET /audit?action=&userId=&from=&to=&page=&limit=
  const list = useAsync(
    () => (rangeInvalid ? Promise.resolve(null) : auditApi.list({ ...filters, page, limit: PAGE_SIZE })),
    [filters.action, filters.userId, filters.from, filters.to, page, rangeInvalid]
  );

  const set = (name) => (e) => {
    setFilters({ ...filters, [name]: e.target.value });
    setPage(1);
  };
  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const items = list.data?.items ?? [];
  const actors = list.data?.actors ?? [];

  return (
    <div>
      <PageHeader title="Історія дій" />
      <p className="-mt-2 mb-4 text-slate-600">
        {canSeeAllHistory
          ? 'Створення, зміна та видалення операцій усіма користувачами — новіші записи вгорі.'
          : 'Ваші дії з операціями: що ви створили, змінили чи видалили — новіші записи вгорі.'}
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        aria-label="Фільтри історії"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3.5"
      >
        <Field label="Дія" htmlFor="h-action" className={half}>
          <Select id="h-action" value={filters.action} onChange={set('action')}>
            <option value="">Усі</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {canSeeAllHistory && (
          <Field label="Користувач" htmlFor="h-user" className={half}>
            <Select id="h-user" value={filters.userId} onChange={set('userId')}>
              <option value="">Усі</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="З дати" htmlFor="h-from" className={half}>
          <Input id="h-from" type="date" value={filters.from} onChange={set('from')} />
        </Field>
        <Field label="По дату" htmlFor="h-to" className={half}>
          <Input id="h-to" type="date" value={filters.to} onChange={set('to')} />
        </Field>
        <Button variant="outline" onClick={reset}>
          Скинути
        </Button>
        {rangeInvalid && <p className="basis-full text-sm text-red-600">Початкова дата пізніше за кінцеву — змініть період.</p>}
      </form>

      <Card className={list.loading && list.data ? 'opacity-60 transition-opacity' : ''}>
        {list.loading && !list.data && !rangeInvalid && <Spinner />}
        {list.error && <ErrorMessage error={list.error} onRetry={list.reload} />}
        {list.data && items.length === 0 && (
          <div className="py-8 text-center">
            <p>Записів не знайдено.</p>
            <p className="text-slate-500">Історія з’являється після створення, зміни чи видалення операцій. Змініть фільтри, щоб побачити інші записи.</p>
          </div>
        )}
        {list.data && items.length > 0 && (
          <>
            <table className="w-full border-collapse">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-200">
                  <th className={`${th} text-left`}>Час</th>
                  {canSeeAllHistory && <th className={`${th} text-left`}>Користувач</th>}
                  <th className={`${th} text-left`}>Дія</th>
                  <th className={`${th} text-left`}>Операція</th>
                  <th className={`${th} text-left`}>Що змінилось</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {items.map((e) => (
                  <tr key={e.id} className="mb-3 block rounded-lg border border-slate-200 px-3 py-1 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:p-0">
                    <td data-label="Час" className={`${td} whitespace-nowrap md:text-left`}>
                      {formatDateTime(e.createdAt)}
                    </td>
                    {canSeeAllHistory && (
                      <td data-label="Користувач" className={`${td} md:text-left`}>
                        {e.userName}
                        {e.userId === null && <span className="text-slate-500"> (видалений)</span>}
                      </td>
                    )}
                    <td data-label="Дія" className={`${td} md:text-left`}>
                      <ActionBadge action={e.action} />
                    </td>
                    <td data-label="Операція" className={`${td} whitespace-nowrap md:text-left`}>
                      № {e.transactionId}
                    </td>
                    <td data-label="Що змінилось" className={`${td} md:text-left`}>
                      <Details entry={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
