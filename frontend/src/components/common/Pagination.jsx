import Button from '../ui/Button.jsx';

// Пагінація: «Назад / 1 2 3 … / Далі» та підпис «Сторінка X з Y»
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  // показуємо не більше 5 номерів навколо поточної сторінки
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = [];
  for (let n = start; n <= Math.min(pages, start + 4); n++) numbers.push(n);

  return (
    <nav aria-label="Пагінація" className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
      <span className="text-sm text-slate-500">
        Сторінка {page} з {pages} · Усього: {total}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Назад
        </Button>
        {numbers.map((n) => (
          <Button
            key={n}
            size="sm"
            variant={n === page ? 'primary' : 'outline'}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ))}
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Далі →
        </Button>
      </div>
    </nav>
  );
}
