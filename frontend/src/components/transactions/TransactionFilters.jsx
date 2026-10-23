import { TYPE_LABELS } from '../../utils/format.js';
import Button from '../ui/Button.jsx';
import Field from '../ui/Field.jsx';
import { Input, Select } from '../ui/Controls.jsx';

const half = 'basis-[calc(50%-0.375rem)] sm:basis-auto';

// Панель пошуку та фільтрів. Компонент «керований»: стан живе в TransactionsPage,
// а тут лише відображення полів і виклик onChange / onReset.
export default function TransactionFilters({ filters, categories, onChange, onReset }) {
  const set = (name) => (e) => onChange({ ...filters, [name]: e.target.value });
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;
  // у списку категорій показуємо лише ті, що відповідають обраному типу
  const visibleCategories = categories.filter((c) => !filters.type || c.type === filters.type);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-label="Фільтри операцій"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3.5"
    >
      <Field label="Пошук" htmlFor="f-q" className="basis-full sm:flex-1 sm:basis-52">
        <Input id="f-q" type="search" placeholder="Опис або категорія" value={filters.q} onChange={set('q')} />
      </Field>
      <Field label="Тип" htmlFor="f-type" className={half}>
        <Select id="f-type" value={filters.type} onChange={(e) => onChange({ ...filters, type: e.target.value, categoryId: '' })}>
          <option value="">Усі</option>
          <option value="income">{TYPE_LABELS.income}</option>
          <option value="expense">{TYPE_LABELS.expense}</option>
        </Select>
      </Field>
      <Field label="Категорія" htmlFor="f-cat" className={half}>
        <Select id="f-cat" value={filters.categoryId} onChange={set('categoryId')}>
          <option value="">Усі</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Від" htmlFor="f-from" className={half}>
        <Input id="f-from" type="date" value={filters.from} onChange={set('from')} />
      </Field>
      <Field label="До" htmlFor="f-to" className={half}>
        <Input id="f-to" type="date" value={filters.to} onChange={set('to')} />
      </Field>
      <Button variant="outline" onClick={onReset}>
        Скинути
      </Button>
      {rangeInvalid && <p className="basis-full text-sm text-red-600">Початок періоду пізніше за кінець — результатів не буде.</p>}
    </form>
  );
}
