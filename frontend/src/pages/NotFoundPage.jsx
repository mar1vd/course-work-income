import { Link } from 'react-router-dom';

// Сторінка для неіснуючих адрес
export default function NotFoundPage() {
  return (
    <div className="py-10 text-center">
      <h1 className="mb-1 text-2xl font-bold">Сторінку не знайдено</h1>
      <p className="mb-4 text-slate-500">Можливо, адресу введено з помилкою.</p>
      <Link to="/" className="inline-flex rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
        На головну
      </Link>
    </div>
  );
}
