import { useState } from 'react';
import { categoriesApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Field from '../components/ui/Field.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { Input, Select } from '../components/ui/Controls.jsx';
import { TYPE_LABELS } from '../utils/format.js';
import { validateCategory } from '../utils/validators.js';

// Форма категорії (локальний компонент сторінки)
function CategoryForm({ initial, onSubmit, onCancel }) {
  const [values, setValues] = useState({ name: initial?.name ?? '', type: initial?.type ?? 'expense' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateCategory(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit({ name: values.name.trim(), type: values.type });
    } catch (error) {
      if (error.details) setErrors(error.details);
      setServerError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Назва категорії" htmlFor="cat-name" error={errors.name}>
        <Input
          id="cat-name"
          value={values.name}
          autoFocus
          aria-invalid={Boolean(errors.name)}
          onChange={(e) => {
            setValues({ ...values, name: e.target.value });
            setErrors({ ...errors, name: undefined });
          }}
        />
      </Field>
      <Field label="Тип" htmlFor="cat-type" error={errors.type}>
        <Select id="cat-type" value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })}>
          <option value="income">{TYPE_LABELS.income}</option>
          <option value="expense">{TYPE_LABELS.expense}</option>
        </Select>
      </Field>
      {serverError && <Alert>{serverError}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Скасувати
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Збереження…' : 'Зберегти'}
        </Button>
      </div>
    </form>
  );
}

// Сторінка «Категорії»: перегляд для всіх, редагування — лише для адміністратора
export default function CategoriesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  // GET /categories
  const list = useAsync(() => categoriesApi.list(), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // POST або PUT /categories
  async function handleSave(data) {
    if (editing && editing !== 'new') {
      await categoriesApi.update(editing.id, data);
      toast.success('Категорію оновлено');
    } else {
      await categoriesApi.create(data);
      toast.success('Категорію додано');
    }
    setEditing(null);
    list.reload();
  }

  // DELETE /categories/:id
  async function handleDelete() {
    setBusy(true);
    try {
      await categoriesApi.remove(deleting.id);
      toast.success('Категорію видалено');
      setDeleting(null);
      list.reload();
    } catch (error) {
      // наприклад, HTTP 409: категорію використано в операціях
      toast.error(error.message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  const renderGroup = (type) => (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">{type === 'income' ? 'Категорії доходів' : 'Категорії витрат'}</h2>
      <ul className="divide-y divide-slate-200">
        {list.data
          .filter((c) => c.type === type)
          .map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {c.name} <span className="text-slate-500">· операцій: {c.transactionsCount}</span>
              </span>
              {isAdmin && (
                <span className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                    Редагувати
                  </Button>
                  <Button variant="dangerGhost" size="sm" onClick={() => setDeleting(c)}>
                    Видалити
                  </Button>
                </span>
              )}
            </li>
          ))}
      </ul>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Категорії">{isAdmin && <Button onClick={() => setEditing('new')}>+ Додати категорію</Button>}</PageHeader>
      {!isAdmin && <p className="mb-3 text-slate-500">Керувати категоріями може лише адміністратор.</p>}

      {list.loading && !list.data && <Spinner />}
      {list.error && <ErrorMessage error={list.error} onRetry={list.reload} />}
      {list.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderGroup('income')}
          {renderGroup('expense')}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Нова категорія' : 'Редагування категорії'} onClose={() => setEditing(null)}>
          <CategoryForm initial={editing === 'new' ? null : editing} onSubmit={handleSave} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog message={`Видалити категорію «${deleting.name}»?`} busy={busy} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
