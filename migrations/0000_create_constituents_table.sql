-- Migration number: 0000

CREATE TABLE IF NOT EXISTS constituents (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(200),
    name VARCHAR(200),
    phone VARCHAR(20),
    address VARCHAR(200),
    created_at DATE,
    updated_at DATE,
    unsubscribed_at DATE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_constituents_email ON constituents (email);

CREATE INDEX IF NOT EXISTS idx_constituents_created_at ON constituents (created_at);