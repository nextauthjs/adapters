CREATE TABLE users
  (
    id             INT NOT NULL AUTO_INCREMENT,
    name           VARCHAR(255),
    email          VARCHAR(255),
    email_verified TIMESTAMP(6),
    image          VARCHAR(255),
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY users_email (email)
  );

CREATE TABLE accounts
  (
    id                   INT NOT NULL AUTO_INCREMENT,
    user_id              INTEGER NOT NULL,
    provider_type        VARCHAR(255) NOT NULL,
    provider_id          VARCHAR(255) NOT NULL,
    provider_account_id  VARCHAR(255) NOT NULL,
    refresh_token        VARCHAR(255),
    access_token         VARCHAR(255),
    access_token_expires TIMESTAMP(6) NULL,
    created_at           TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at           TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY account_provider (provider_id,provider_account_id)
  );

CREATE TABLE sessions
  (
    id            INT NOT NULL AUTO_INCREMENT,
    user_id       INTEGER NOT NULL,
    expires       TIMESTAMP(6) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    access_token  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY sessions_session_token (session_token),
    UNIQUE KEY sessions_access_token (access_token)
  );

CREATE TABLE verification_requests
  (
    id         INT NOT NULL AUTO_INCREMENT,
    identifier VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires    TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY verification_requests_token (identifier, token)
  );
