// Бізнес-логіка звітів.
import * as reportRepository from '../repositories/report.repository.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Підсумки за період у форматі, який використовує frontend (дашборд і сторінка «Звіти»)
export async function summary(from, to) {
  const { totals, byCategory, byMonth } = await reportRepository.summary(from, to);
  return {
    from,
    to,
    count: totals.count,
    totalIncome: round2(totals.totalIncome),
    totalExpense: round2(totals.totalExpense),
    profit: round2(totals.totalIncome - totals.totalExpense),
    byCategory: byCategory.map((c) => ({ ...c, total: round2(c.total) })),
    byMonth: byMonth.map((m) => ({ month: m.month, income: round2(m.income), expense: round2(m.expense) })),
  };
}

// Зберігає знімок звіту (підсумки періоду) в історію користувача
export async function save(userId, from, to) {
  const s = await summary(from, to);
  return reportRepository.save(userId, { from, to, totalIncome: s.totalIncome, totalExpense: s.totalExpense });
}

export const history = (userId) => reportRepository.findByUser(userId);
