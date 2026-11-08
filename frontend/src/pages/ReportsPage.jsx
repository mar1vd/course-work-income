import { useState } from 'react';
import { reportsApi } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Field from '../components/ui/Field.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Input } from '../components/ui/Controls.jsx';
import { amountClass, formatMoney, monthLabel, monthStartISO, toISO, todayISO } from '../utils/format.js';
import { validatePeriod } from '../utils/validators.js';
import { EXPORT_STRATEGIES, ReportExporter, downloadFile } from '../patterns/strategy/index.js';

// ЛР № 12 (Strategy): формат файла визначає стратегія з EXPORT_STRATEGIES,
// тому сторінка не містить коду формування CSV чи Excel і не змінюється при додаванні формату.
const exporter = new ReportExporter(EXPORT_STRATEGIES.csv);

function exportReport(summary, format) {
  exporter.setStrategy(EXPORT_STRATEGIES[format]);
  downloadFile(exporter.createFile(summary));
}

const cellClass = 'border-b border-slate-200 px-2 py-2';

// Сторінка «Звіти»: вибір періоду, підсумки, розбивка за категоріями, експорт
export default function ReportsPage() {
  const [period, setPeriod] = useState({ from: monthStartISO(0), to: todayISO() });
  const periodError = validatePeriod(period.from, period.to);

  // GET /reports/summary; запит виконується лише якщо період коректний
  const report = useAsync(() => (periodError ? Promise.resolve(null) : reportsApi.summary(period)), [period.from, period.to, periodError]);

  // швидкий вибір періоду: поточний місяць / 3 місяці / з початку року
  const setQuick = (kind) => {
    const now = new Date();
    const from = kind === 'month' ? monthStartISO(0) : kind === 'quarter' ? monthStartISO(2) : toISO(new Date(now.getFullYear(), 0, 1));
    setPeriod({ from, to: todayISO() });
  };

  const s = report.data;
  const renderRows = (type) =>
    s.byCategory
      .filter((c) => c.type === type)
      .map((c) => (
        <tr key={c.categoryId}>
          <td className={cellClass}>{c.name}</td>
          <td className={`${cellClass} text-right`}>{formatMoney(c.total)}</td>
        </tr>
      ));

  return (
    <div>
      <PageHeader title="Звіти">
        <div className="flex flex-wrap gap-2">
          {Object.entries(EXPORT_STRATEGIES).map(([format, strategy]) => (
            <Button key={format} variant="outline" disabled={!s} onClick={() => exportReport(s, format)}>
              Експортувати {strategy.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <form onSubmit={(e) => e.preventDefault()} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
        <Field label="Від" htmlFor="r-from" className="basis-[calc(50%-0.375rem)] sm:basis-auto">
          <Input id="r-from" type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} />
        </Field>
        <Field label="До" htmlFor="r-to" className="basis-[calc(50%-0.375rem)] sm:basis-auto">
          <Input id="r-to" type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setQuick('month')}>
            Поточний місяць
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuick('quarter')}>
            3 місяці
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuick('year')}>
            З початку року
          </Button>
        </div>
        {periodError && <p className="basis-full text-sm text-red-600">{periodError}</p>}
      </form>

      {report.loading && !s && !periodError && <Spinner />}
      {report.error && <ErrorMessage error={report.error} onRetry={report.reload} />}

      {s && (
        <>
          <div className="my-4 grid gap-4 lg:grid-cols-3">
            <KpiCard title="Доходи" value={formatMoney(s.totalIncome)} tone="income" />
            <KpiCard title="Витрати" value={formatMoney(s.totalExpense)} tone="expense" />
            <KpiCard title="Прибуток" value={formatMoney(s.profit)} tone={s.profit >= 0 ? 'income' : 'expense'} hint={`Операцій: ${s.count}`} />
          </div>

          {s.count === 0 ? (
            <div className="py-8 text-center">
              <p>За обраний період операцій немає.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 text-lg font-semibold">Доходи за категоріями</h2>
                <table className="w-full">
                  <tbody>{renderRows('income')}</tbody>
                </table>
              </Card>
              <Card>
                <h2 className="mb-3 text-lg font-semibold">Витрати за категоріями</h2>
                <table className="w-full">
                  <tbody>{renderRows('expense')}</tbody>
                </table>
              </Card>
              <Card className="lg:col-span-2">
                <h2 className="mb-3 text-lg font-semibold">Динаміка по місяцях</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-slate-500 uppercase">
                      <th className={cellClass}>Місяць</th>
                      <th className={`${cellClass} text-right`}>Доходи</th>
                      <th className={`${cellClass} text-right`}>Витрати</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byMonth.map((m) => (
                      <tr key={m.month}>
                        <td className={cellClass}>{monthLabel(m.month)}</td>
                        <td className={`${cellClass} text-right ${amountClass('income')}`}>{formatMoney(m.income)}</td>
                        <td className={`${cellClass} text-right ${amountClass('expense')}`}>{formatMoney(m.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
