// Репозиторій звітів: агрегування даних безпосередньо в SQL та історія збережених звітів.
import { query } from '../config/db.js';

// Підсумки за період: загальні суми, розбивка за категоріями та за місяцями
export async function summary(from, to) {
  const totals = await query(
    `SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)  AS "totalIncome",
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS "totalExpense",
            COUNT(*)::int AS count
       FROM transactions
      WHERE operation_date BETWEEN $1 AND $2`,
    [from, to]
  );
  const byCategory = await query(
    `SELECT c.id AS "categoryId", c.name, c.type, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
      WHERE t.operation_date BETWEEN $1 AND $2
      GROUP BY c.id
      ORDER BY total DESC`,
    [from, to]
  );
  const byMonth = await query(
    `SELECT to_char(operation_date, 'YYYY-MM') AS month,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)  AS income,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense
       FROM transactions
      WHERE operation_date BETWEEN $1 AND $2
      GROUP BY month
      ORDER BY month`,
    [from, to]
  );
  return { totals: totals.rows[0], byCategory: byCategory.rows, byMonth: byMonth.rows };
}

// Збереження знімка звіту в таблицю reports
export async function save(userId, { from, to, totalIncome, totalExpense }) {
  const { rows } = await query(
    `INSERT INTO reports (user_id, period_start, period_end, total_income, total_expense)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id AS "userId", period_start AS "periodStart", period_end AS "periodEnd",
               total_income AS "totalIncome", total_expense AS "totalExpense", generated_at AS "generatedAt"`,
    [userId, from, to, totalIncome, totalExpense]
  );
  return rows[0];
}

export async function findByUser(userId) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId", period_start AS "periodStart", period_end AS "periodEnd",
            total_income AS "totalIncome", total_expense AS "totalExpense", generated_at AS "generatedAt"
       FROM reports
      WHERE user_id = $1
      ORDER BY generated_at DESC, id DESC
      LIMIT 50`,
    [userId]
  );
  return rows;
}
