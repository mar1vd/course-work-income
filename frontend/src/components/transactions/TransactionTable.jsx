import { amountClass, formatDate, formatMoney } from '../../utils/format.js';
import Button from '../ui/Button.jsx';

// Класи заголовків і комірок. До 768 px рядки стають картками: підпис колонки
// береться з атрибута data-label (before:content-[attr(data-label)]), від 768 px — звичайна таблиця (md:).
const th = 'px-2.5 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase';
const td =
  'flex justify-between gap-4 border-b border-slate-100 py-1.5 text-right last:border-b-0 before:font-semibold before:text-slate-500 before:content-[attr(data-label)] md:table-cell md:border-b-0 md:px-2.5 md:py-2.5 md:before:hidden';

// Таблиця операцій. Стану не має: дані та дії приходять через props (items, canEdit, onEdit, onDelete).
export default function TransactionTable({ items, canEdit, onEdit, onDelete }) {
  // порожній стан — підказка, що робити далі
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p>Операцій не знайдено.</p>
        <p className="text-slate-500">Змініть фільтри або додайте нову операцію.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-slate-200">
          <th className={`${th} text-left`}>Дата</th>
          <th className={`${th} text-left`}>Категорія</th>
          <th className={`${th} text-left`}>Опис</th>
          <th className={`${th} text-right`}>Сума</th>
          {canEdit && <th className={`${th} text-right`}>Дії</th>}
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {items.map((t) => (
          <tr key={t.id} className="mb-3 block rounded-lg border border-slate-200 px-3 py-1 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:p-0">
            <td data-label="Дата" className={`${td} md:text-left`}>
              {formatDate(t.date)}
            </td>
            <td data-label="Категорія" className={`${td} md:text-left`}>
              {t.categoryName}
            </td>
            <td data-label="Опис" className={`${td} md:text-left`}>
              {t.description || '—'}
            </td>
            <td data-label="Сума" className={`${td} whitespace-nowrap md:text-right ${amountClass(t.type)}`}>
              {t.type === 'expense' ? '−' : '+'}
              {formatMoney(t.amount)}
            </td>
            {canEdit && (
              <td className="flex justify-end gap-1 py-1.5 whitespace-nowrap md:table-cell md:px-2.5 md:py-2.5 md:text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                  Редагувати
                </Button>
                <Button variant="dangerGhost" size="sm" onClick={() => onDelete(t)}>
                  Видалити
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
