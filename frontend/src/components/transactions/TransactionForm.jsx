import { useMemo, useState } from 'react';
import { parseAmount, validateTransaction } from '../../utils/validators.js';
import { todayISO } from '../../utils/format.js';
import Alert from '../ui/Alert.jsx';
import Button from '../ui/Button.jsx';
import Field from '../ui/Field.jsx';
import { Input, Select, Textarea } from '../ui/Controls.jsx';

// Варіанти перемикача типу операції: значення, підпис, клас активного стану
const TYPE_OPTIONS = [
  ['expense', 'Витрата', 'bg-red-50 font-semibold text-red-700'],
  ['income', 'Дохід', 'bg-green-50 font-semibold text-green-700'],
];

// Форма додавання / редагування операції.
//   initial   — операція для редагування (або null для нової)
//   onSubmit  — async-функція від батька, яка викликає API; якщо кидає ApiError — показуємо помилки
export default function TransactionForm({ initial, categories, onSubmit, onCancel }) {
  // Стан полів форми (усе — рядки, як у <input>)
  const [values, setValues] = useState(() => ({
    type: initial?.type ?? 'expense',
    categoryId: initial ? String(initial.categoryId) : '',
    amount: initial ? String(initial.amount) : '',
    date: initial?.date ?? todayISO(),
    description: initial?.description ?? '',
  }));
  // помилки валідації по полях
  const [errors, setErrors] = useState({});
  // блокуємо кнопки під час запиту
  const [submitting, setSubmitting] = useState(false);
  // загальна помилка від сервера
  const [serverError, setServerError] = useState('');

  // Категорії відфільтровані за типом: для «Доходу» не можна обрати «Оренду» (запобігання помилкам)
  const available = useMemo(() => categories.filter((c) => c.type === values.type), [categories, values.type]);

  // Оновлює значення поля; змінили тип — скидаємо категорію; помилку поля прибираємо, поки користувач виправляє
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'type') next.categoryId = '';
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  // Спочатку валідація на клієнті; якщо помилок немає — відправляємо через onSubmit (POST/PUT)
  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateTransaction(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      // тіло запиту для POST/PUT /transactions
      await onSubmit({
        type: values.type,
        categoryId: Number(values.categoryId),
        amount: parseAmount(values.amount),
        date: values.date,
        description: values.description.trim(),
      });
    } catch (error) {
      // 422 — помилки від сервера по полях; інакше показуємо загальне повідомлення
      if (error.details) setErrors(error.details);
      setServerError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Тип операції" error={errors.type}>
        <div role="group" aria-label="Тип операції" className="flex overflow-hidden rounded-md border border-slate-300">
          {TYPE_OPTIONS.map(([value, label, activeClass], i) => (
            <button
              key={value}
              type="button"
              aria-pressed={values.type === value}
              onClick={() => handleChange({ target: { name: 'type', value } })}
              className={`flex-1 cursor-pointer px-3 py-2 ${i > 0 ? 'border-l border-slate-300' : ''} ${values.type === value ? activeClass : 'bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Категорія" htmlFor="tx-category" error={errors.categoryId}>
        <Select id="tx-category" name="categoryId" value={values.categoryId} onChange={handleChange} aria-invalid={Boolean(errors.categoryId)}>
          <option value="">— Оберіть категорію —</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Сума, ₴" htmlFor="tx-amount" error={errors.amount}>
          <Input
            id="tx-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            onChange={handleChange}
            aria-invalid={Boolean(errors.amount)}
            autoFocus
          />
        </Field>
        <Field label="Дата" htmlFor="tx-date" error={errors.date}>
          <Input id="tx-date" name="date" type="date" max={todayISO()} value={values.date} onChange={handleChange} aria-invalid={Boolean(errors.date)} />
        </Field>
      </div>

      <Field label="Опис (необов'язково)" htmlFor="tx-desc" error={errors.description}>
        <Textarea id="tx-desc" name="description" rows="3" maxLength={300} value={values.description} onChange={handleChange} />
      </Field>

      {serverError && <Alert>{serverError}</Alert>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Скасувати
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Збереження…' : initial ? 'Зберегти зміни' : 'Додати операцію'}
        </Button>
      </div>
    </form>
  );
}
