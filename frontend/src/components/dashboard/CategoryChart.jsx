import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#2563eb', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#64748b', '#ec4899', '#84cc16'];

// Кільцева діаграма «Структура витрат за категоріями» (Chart.js)
export default function CategoryChart({ categories }) {
  const expenses = categories.filter((c) => c.type === 'expense');
  if (expenses.length === 0) return <p className="text-slate-500">Немає даних про витрати за обраний період.</p>;

  const data = {
    labels: expenses.map((c) => c.name),
    datasets: [{ data: expenses.map((c) => c.total), backgroundColor: COLORS, borderWidth: 1 }],
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  return (
    <div className="relative h-72 2xl:h-96">
      <Doughnut data={data} options={options} />
    </div>
  );
}
