-- V1: Scaffold the initial auth_users table with an ENUM role type.
-- Note: this table is dropped in V2. It exists only for historical record.

CREATE TYPE auth_user_role AS ENUM ('customer', 'provider', 'admin');

CREATE TABLE auth_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number  varchar(15) NOT NULL,
  role          auth_user_role NOT NULL DEFAULT 'customer',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE UNIQUE INDEX auth_users_phone_active_idx
  ON auth_users (phone_number)
  WHERE deleted_at IS NULL;
