CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role       user_role DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversions (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    from_format  VARCHAR(10) NOT NULL,
    to_format    VARCHAR(10) NOT NULL,
    file_size    BIGINT,
    status       VARCHAR(20) DEFAULT 'pending',
    path_in      TEXT,
    path_out     TEXT,
    share_token      VARCHAR(64) UNIQUE,
    share_expires_at TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW()
);