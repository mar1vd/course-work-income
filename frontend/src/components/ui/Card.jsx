// Біла картка з рамкою — контейнер для блоків сторінки
export default function Card({ className = '', children }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 2xl:p-6 ${className}`}>{children}</section>;
}
