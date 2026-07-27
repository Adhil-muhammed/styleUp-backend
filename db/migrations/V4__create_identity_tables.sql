-- V4: Core identity tables: users, user_identities, user_sessions,
--     permissions, roles, role_permissions, customers.

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          varchar(255) NOT NULL,
  password_hash  varchar(255),
  is_active      boolean NOT NULL DEFAULT TRUE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

-- Partial unique index: email must be unique among non-deleted users.
CREATE UNIQUE INDEX idx_users_email
  ON users (email)
  WHERE deleted_at IS NULL;

CREATE TABLE user_identities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  provider     varchar(32) NOT NULL,
  provider_id  varchar(255) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_identities_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_identities_provider
    CHECK (provider IN ('google', 'apple', 'facebook'))
);

CREATE INDEX idx_user_identities_user
  ON user_identities (user_id);

CREATE UNIQUE INDEX idx_user_identities_provider
  ON user_identities (provider, provider_id);

CREATE TABLE user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  device_id     varchar(128) NOT NULL,
  refresh_token varchar(512) NOT NULL,
  expires_at    timestamptz NOT NULL,
  is_revoked    boolean NOT NULL DEFAULT FALSE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_user
  ON user_sessions (user_id);

CREATE UNIQUE INDEX idx_user_sessions_token
  ON user_sessions (refresh_token);

CREATE TABLE permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        varchar(64) NOT NULL,
  description text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_permissions_slug
  ON permissions (slug);

CREATE TABLE roles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           varchar(64) NOT NULL,
  is_system_role boolean NOT NULL DEFAULT FALSE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_roles_name
  ON roles (name);

CREATE TABLE role_permissions (
  role_id       uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);

-- customers: user_id is both PK and FK — one profile row per user.
CREATE TABLE customers (
  user_id          uuid NOT NULL,
  display_name     varchar(128) NOT NULL,
  phone            varchar(32) NOT NULL,
  avatar_url       varchar(512),
  nickname         varchar(64),
  date_of_birth    date,
  gender           varchar(16),
  country          varchar(64),
  xp_points        int NOT NULL DEFAULT 0,
  membership_level int NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_customers PRIMARY KEY (user_id),
  CONSTRAINT fk_customers_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_customers_gender
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not')),
  CONSTRAINT chk_customers_xp_points CHECK (xp_points >= 0)
);

CREATE INDEX idx_customers_phone
  ON customers (phone);
