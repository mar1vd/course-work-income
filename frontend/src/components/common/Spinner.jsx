// Індикатор завантаження
export default function Spinner({ label = 'Завантаження…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-slate-500">
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-slate-300 border-t-blue-600" />
      <span>{label}</span>
    </div>
  );
}
