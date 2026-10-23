// Заголовок сторінки; children — кнопки дій праворуч
export default function PageHeader({ title, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold 2xl:text-3xl">{title}</h1>
      {children}
    </div>
  );
}
