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

-- Журнал дій з операціями (лабораторна робота № 12, патерн Observer).
-- Записи додає спостерігач AuditLogObserver після кожного успішного створення, зміни чи видалення операції.
-- transaction_id не є зовнішнім ключем: після видалення операції запис історії має залишитися.
-- user_name — знімок імені на момент дії, щоб історія не втрачала автора, якщо користувача видалять.
CREATE TABLE IF NOT EXISTS audit_log (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name      VARCHAR(150) NOT NULL,
    action         VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    transaction_id INTEGER NOT NULL,
    before_data    JSONB,
    after_data     JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- календарна дата дії за часовим поясом підприємства (BUSINESS_TIMEZONE) — для фільтра за періодом
    action_date    DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user        ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date        ON audit_log(action_date);
CREATE INDEX IF NOT EXISTS idx_audit_transaction ON audit_log(transaction_id);
