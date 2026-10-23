// Репозиторій користувачів: єдине місце, де виконуються SQL-запити до таблиці users.
import { query } from '../config/db.js';

const COLUMNS = `id, full_name AS "fullName", email, role`;

// Для автентифікації потрібен ще й хеш пароля
export async function findByEmail(email) {
  const { rows } = await query(
    `SELECT ${COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findAll() {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users ORDER BY id`);
  return rows;
}

export async function create({ fullName, email, passwordHash, role }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [fullName, email, passwordHash, role]
  );
  return rows[0];
}

// passwordHash = null — пароль не змінюється
export async function update(id, { fullName, email, role, passwordHash }) {
  const { rows } = await query(
    `UPDATE users
        SET full_name = $2, email = $3, role = $4, password_hash = COALESCE($5, password_hash)
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, fullName, email, role, passwordHash]
  );
  return rows[0] || null;
}

export async function remove(id) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function countByRole(role) {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM users WHERE role = $1', [role]);
  return rows[0].count;
}

export async function countTransactions(userId) {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM transactions WHERE user_id = $1', [userId]);
  return rows[0].count;
}
