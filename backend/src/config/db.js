// Підключення до PostgreSQL через пул з'єднань.
import pg from 'pg';
import { config } from './env.js';

const { Pool, types } = pg;

// За замовчуванням драйвер повертає DATE як об'єкт Date, NUMERIC і BIGINT — як рядки.
// Нам потрібні "YYYY-MM-DD" для дат та числа для сум.
types.setTypeParser(1082, (value) => value); // DATE
types.setTypeParser(1700, (value) => parseFloat(value)); // NUMERIC
types.setTypeParser(20, (value) => parseInt(value, 10)); // BIGINT (результат COUNT)

export const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

// Усі SQL-запити виконуються з параметрами ($1, $2, ...) — це захищає від SQL-ін'єкцій
export const query = (text, params) => pool.query(text, params);

export const closePool = () => pool.end();
