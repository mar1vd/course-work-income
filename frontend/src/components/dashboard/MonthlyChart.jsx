import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { fillMonths, monthLabel } from '../../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Стовпчикова діаграма «Доходи та витрати по місяцях» (Chart.js).
// from / to — межі періоду: місяці без операцій показуються з нульовими стовпцями.
export default function MonthlyChart({ byMonth, from, to }) {
  const months = fillMonths(byMonth, from, to);
  const data = {
    labels: months.map((m) => monthLabel(m.month)),
    datasets: [
      { label: 'Доходи', data: months.map((m) => m.income), backgroundColor: '#16a34a' },
      { label: 'Витрати', data: months.map((m) => m.expense), backgroundColor: '#dc2626' },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v / 1000} тис.` } } },
  };
  return (
    <div className="relative h-72 2xl:h-96">
      <Bar
        data={data}
        options={options}
        role="img"
        aria-label={`Доходи та витрати по місяцях: ${data.labels.join(', ')}`}
      />
    </div>
  );
}
