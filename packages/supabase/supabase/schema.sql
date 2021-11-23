CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT
);
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token VARCHAR(255),
  session_state VARCHAR(255),
  CONSTRAINT fk_user FOREIGN KEY("userId") REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY("userId") REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMPTZ NOT NULL
);