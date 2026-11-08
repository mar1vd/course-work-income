// Репозиторій журналу дій (таблиця audit_log). Лише SQL-запити з параметрами.
import { query } from '../config/db.js';
import { todayISO } from '../utils/validators.js';

const SELECT = `
  SELECT a.id, a.user_id AS "userId", a.user_name AS "userName", a.action,
         a.transaction_id AS "transactionId", a.before_data AS before, a.after_data AS after,
         a.created_at AS "createdAt"
    FROM audit_log a`;

export async function add({ userId, userName, action, transactionId, before, after }) {
  const { rows } = await query(
    `INSERT INTO audit_log (user_id, user_name, action, transaction_id, before_data, after_data, action_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, userName, action, transactionId, before, after, todayISO()]
  );
  return rows[0].id;
}

// Умови WHERE для фільтрів. Період порівнюється з action_date — датою дії за часовим поясом
// підприємства, яку визначає сервер (так фільтр не залежить від налаштувань часових поясів СУБД)
function buildWhere({ userId, action, transactionId, from, to }) {
  const where = [];
  const params = [];
  const add = (condition, value) => {
    params.push(value);
    where.push(condition.replace('?', `$${params.length}`));
  };
  if (userId) add('a.user_id = ?', userId);
  if (action) add('a.action = ?', action);
  if (transactionId) add('a.transaction_id = ?', transactionId);
  if (from) add('a.action_date >= ?', from);
  if (to) add('a.action_date <= ?', to);
  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Сторінка журналу (новіші записи першими): { items, total }
export async function findPage({ page, limit, ...filters }) {
  const { whereSql, params } = buildWhere(filters);
  const totalResult = await query(`SELECT COUNT(*)::int AS total FROM audit_log a ${whereSql}`, params);
  const { rows } = await query(
    `${SELECT} ${whereSql} ORDER BY a.created_at DESC, a.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );
  return { items: rows, total: totalResult.rows[0].total };
}

// Користувачі, які мають записи в журналі (для фільтра «Користувач» на сторінці історії)
export async function findActors(userId = null) {
  const { rows } = await query(
    `SELECT DISTINCT ON (a.user_id) a.user_id AS id, COALESCE(u.full_name, a.user_name) AS "fullName"
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.user_id IS NOT NULL ${userId ? 'AND a.user_id = $1' : ''}
      ORDER BY a.user_id`,
    userId ? [userId] : []
  );
  return rows;
}
