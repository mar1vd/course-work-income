// Репозиторій категорій.
import { query } from '../config/db.js';

// Категорії разом із кількістю операцій у кожній
export async function findAll() {
  const { rows } = await query(
    `SELECT c.id, c.name, c.type, COUNT(t.id)::int AS "transactionsCount"
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.type, c.name`
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query(
    `SELECT c.id, c.name, c.type, COUNT(t.id)::int AS "transactionsCount"
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id
      WHERE c.id = $1
      GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
}

// Пошук дубліката за назвою (без урахування регістру) в межах типу
export async function findDuplicate(name, type, excludeId = null) {
  const { rows } = await query(
    `SELECT id FROM categories WHERE lower(name) = lower($1) AND type = $2 AND ($3::int IS NULL OR id <> $3)`,
    [name, type, excludeId]
  );
  return rows[0] || null;
}

export async function create({ name, type }) {
  const { rows } = await query('INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING id', [name, type]);
  return findById(rows[0].id);
}

export async function update(id, { name, type }) {
  await query('UPDATE categories SET name = $2, type = $3 WHERE id = $1', [id, name, type]);
  return findById(id);
}

export async function remove(id) {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  return rowCount > 0;
}
