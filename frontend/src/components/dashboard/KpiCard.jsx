const tones = {
  income: ['border-l-green-700', 'text-green-700'],
  expense: ['border-l-red-700', 'text-red-700'],
  neutral: ['border-l-slate-400', 'text-slate-800'],
};

// Картка ключового показника (дохід / витрати / прибуток)
export default function KpiCard({ title, value, tone = 'neutral', hint }) {
  const [border, text] = tones[tone];
  return (
    <div className={`rounded-lg border border-l-4 border-slate-200 bg-white px-4 py-3.5 2xl:px-6 2xl:py-5 ${border}`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`my-0.5 text-2xl font-bold 2xl:text-3xl ${text}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
