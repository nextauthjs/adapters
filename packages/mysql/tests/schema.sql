CREATE TABLE users
  (
    id             INT NOT NULL AUTO_INCREMENT,
    name           VARCHAR(255),
    email          VARCHAR(255),
    email_verified TIMESTAMP(6),
    image          VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE KEY users_email (email)
  );

CREATE TABLE accounts
  (
    id                   INT NOT NULL AUTO_INCREMENT,
    user_id              INTEGER NOT NULL,
    type                 VARCHAR(255) NOT NULL,
    provider             VARCHAR(255) NOT NULL,
    provider_account_id  VARCHAR(255) NOT NULL,
    refresh_token        VARCHAR(255),
    access_token         VARCHAR(255),
    expires_at           TIMESTAMP(6) NULL,
    token_type           VARCHAR(255) NOT NULL,
    scope                VARCHAR(255) NOT NULL,
    id_token             VARCHAR(255) NOT NULL,
    session_state        VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY account_provider (provider, provider_account_id)
  );

CREATE TABLE sessions
  (
    id            INT NOT NULL AUTO_INCREMENT,
    user_id       INTEGER NOT NULL,
    expires       TIMESTAMP(6) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY sessions_session_token (session_token),
  );

CREATE TABLE verification_tokens
  (
    id         INT NOT NULL AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires    TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY verification_requests_token (identifier, token)
  );
