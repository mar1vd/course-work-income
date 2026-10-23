// Репозиторій операцій. SQL-запити формуються з параметрами, значення користувача
// ніколи не підставляються в текст запиту напряму.
import { query } from '../config/db.js';

// Спільна частина SELECT: операція разом із назвою категорії у форматі, який очікує frontend
const SELECT = `
  SELECT t.id, t.user_id AS "userId", t.category_id AS "categoryId", c.name AS "categoryName",
         t.type, t.amount, t.operation_date AS date, t.description
    FROM transactions t
    JOIN categories c ON c.id = t.category_id`;

// Екранування спецсимволів LIKE, щоб "%" і "_" у пошуку сприймалися буквально
const escapeLike = (text) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

// Список з фільтрами та пагінацією: повертає { items, total }
export async function findPage({ type, categoryId, from, to, q, page, limit }) {
  const where = [];
  const params = [];
  const add = (condition, value) => {
    params.push(value);
    where.push(condition.replace('?', `$${params.length}`));
  };

  if (type) add('t.type = ?', type);
  if (categoryId) add('t.category_id = ?', categoryId);
  if (from) add('t.operation_date >= ?', from);
  if (to) add('t.operation_date <= ?', to);
  if (q) {
    params.push(`%${escapeLike(q.trim())}%`);
    const p = `$${params.length}`;
    where.push(`(t.description ILIKE ${p} OR c.name ILIKE ${p})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalResult = await query(
    `SELECT COUNT(*)::int AS total FROM transactions t JOIN categories c ON c.id = t.category_id ${whereSql}`,
    params
  );
  const { rows } = await query(
    `${SELECT} ${whereSql} ORDER BY t.operation_date DESC, t.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );
  return { items: rows, total: totalResult.rows[0].total };
}

export async function findById(id) {
  const { rows } = await query(`${SELECT} WHERE t.id = $1`, [id]);
  return rows[0] || null;
}

export async function create(userId, { type, categoryId, amount, date, description }) {
  const { rows } = await query(
    `INSERT INTO transactions (user_id, category_id, amount, type, operation_date, description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, categoryId, amount, type, date, description]
  );
  return findById(rows[0].id);
}

export async function update(id, { type, categoryId, amount, date, description }) {
  await query(
    `UPDATE transactions
        SET category_id = $2, amount = $3, type = $4, operation_date = $5, description = $6
      WHERE id = $1`,
    [id, categoryId, amount, type, date, description]
  );
  return findById(id);
}

export async function remove(id) {
  const { rowCount } = await query('DELETE FROM transactions WHERE id = $1', [id]);
  return rowCount > 0;
}
