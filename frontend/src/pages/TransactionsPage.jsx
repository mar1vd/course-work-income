import { useMemo, useState } from 'react';
import { categoriesApi, transactionsApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDebounce } from '../hooks/useDebounce.js';
import TransactionFilters from '../components/transactions/TransactionFilters.jsx';
import TransactionTable from '../components/transactions/TransactionTable.jsx';
import TransactionForm from '../components/transactions/TransactionForm.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

// кількість рядків на сторінці
const PAGE_SIZE = 10;
const EMPTY_FILTERS = { type: '', categoryId: '', from: '', to: '', q: '' };

// Сторінка «Операції»: список з фільтрами, пагінацією та CRUD через модальні вікна.
export default function TransactionsPage() {
  const { canEdit } = useAuth();
  const toast = useToast();

  // ---- Стан сторінки ----
  // значення фільтрів
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // поточна сторінка
  const [page, setPage] = useState(1);
  // null | 'new' | об'єкт операції (відкрита форма)
  const [editing, setEditing] = useState(null);
  // операція, що чекає підтвердження видалення
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Пошук відправляємо на сервер із затримкою 300 мс (debounce)
  const debouncedQuery = useDebounce(filters.q, 300);

  // ---- Виклики API ----
  // GET /categories — потрібні для фільтра та форми (завантажуються один раз)
  const categories = useAsync(() => categoriesApi.list(), []);

  // GET /transactions?type=&categoryId=&from=&to=&q=&page=&limit=
  // Запит повторюється автоматично при зміні будь-якого фільтра або сторінки
  const list = useAsync(
    () =>
      transactionsApi.list({
        type: filters.type,
        categoryId: filters.categoryId,
        from: filters.from,
        to: filters.to,
        q: debouncedQuery,
        page,
        limit: PAGE_SIZE,
      }),
    [filters.type, filters.categoryId, filters.from, filters.to, debouncedQuery, page]
  );

  // Зміна фільтрів завжди повертає на першу сторінку
  const handleFiltersChange = (next) => {
    setFilters(next);
    setPage(1);
  };

  // POST або PUT залежно від того, нова це операція чи редагування
  async function handleSave(data) {
    if (editing && editing !== 'new') {
      await transactionsApi.update(editing.id, data);
      toast.success('Операцію оновлено');
    } else {
      await transactionsApi.create(data);
      toast.success('Операцію додано');
    }
    setEditing(null);
    // оновлюємо таблицю після збереження
    list.reload();
  }

  // DELETE /transactions/:id
  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await transactionsApi.remove(deleting.id);
      toast.success('Операцію видалено');
      setDeleting(null);

      // якщо видалили останній запис на сторінці — переходимо на попередню
      if (list.data.items.length === 1 && page > 1) setPage(page - 1);
      else list.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const items = list.data?.items ?? [];
  const catList = useMemo(() => categories.data ?? [], [categories.data]);

  return (
    <div>
      <PageHeader title="Операції">
        {canEdit && (
          <Button disabled={!categories.data} onClick={() => setEditing('new')}>
            + Додати операцію
          </Button>
        )}
      </PageHeader>

      <TransactionFilters
        filters={filters}
        categories={catList}
        onChange={handleFiltersChange}
        onReset={() => handleFiltersChange(EMPTY_FILTERS)}
      />

      <Card className={list.loading && list.data ? 'opacity-60 transition-opacity' : ''}>
        {list.loading && !list.data && <Spinner />}
        {list.error && <ErrorMessage error={list.error} onRetry={list.reload} />}
        {list.data && (
          <>
            <TransactionTable items={items} canEdit={canEdit} onEdit={setEditing} onDelete={setDeleting} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
          </>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Нова операція' : 'Редагування операції'} onClose={() => setEditing(null)}>
          <TransactionForm
            initial={editing === 'new' ? null : editing}
            categories={catList}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Ви дійсно хочете видалити операцію від ${formatDate(deleting.date)} на суму ${formatMoney(deleting.amount)}?`}
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
