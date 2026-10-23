-- Схема бази даних (відповідає лабораторній роботі № 5)

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'accountant'
                   CHECK (role IN ('admin', 'accountant', 'manager')),
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    type           VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount         NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type           VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    operation_date DATE NOT NULL,
    description    VARCHAR(255),
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start   DATE NOT NULL,
    period_end     DATE NOT NULL CHECK (period_end >= period_start),
    total_income   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_expense  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    generated_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(operation_date);
CREATE INDEX IF NOT EXISTS idx_reports_user          ON reports(user_id);
