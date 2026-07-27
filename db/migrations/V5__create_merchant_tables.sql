-- V5: Merchant tables: shops (with PostGIS geography), shop_gallery, staff, user_roles.
-- user_roles is created here (not in V4) because it references shops(id).

CREATE TABLE shops (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL,
  name              varchar(128) NOT NULL,
  email             varchar(255) NOT NULL,
  phone             varchar(32) NOT NULL,
  city              varchar(64) NOT NULL,
  address           text NOT NULL,
  location          geography(Point, 4326) NOT NULL,
  status            varchar(32) NOT NULL,
  rejection_reason  text,
  suspension_reason text,
  is_featured       boolean NOT NULL DEFAULT FALSE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT fk_shops_owner
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_shops_status
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'))
);

CREATE INDEX idx_shops_owner
  ON shops (owner_id);

-- Spatial index for proximity / geo queries.
CREATE INDEX idx_shops_location
  ON shops USING GIST (location);

-- Covering index for city + status list queries, excluding soft-deleted rows.
CREATE INDEX idx_shops_city_status
  ON shops (city, status)
  WHERE deleted_at IS NULL;

CREATE TABLE shop_gallery (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid NOT NULL,
  url        varchar(512) NOT NULL,
  alt_text   varchar(256),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_shop_gallery_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

CREATE INDEX idx_shop_gallery_shop
  ON shop_gallery (shop_id);

CREATE TABLE staff (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  shop_id             uuid NOT NULL,
  name                varchar(128) NOT NULL,
  job_title           varchar(64) NOT NULL,
  bio                 text,
  availability_status varchar(32) NOT NULL DEFAULT 'off',
  workflow_status     varchar(32) NOT NULL DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT fk_staff_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_staff_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT chk_staff_availability_status
    CHECK (availability_status IN ('available', 'busy', 'off')),
  CONSTRAINT chk_staff_workflow_status
    CHECK (workflow_status IN ('active', 'inactive', 'rejected'))
);

CREATE INDEX idx_staff_user
  ON staff (user_id);

-- Partial index: active staff lookups by shop skip soft-deleted rows.
CREATE INDEX idx_staff_shop
  ON staff (shop_id)
  WHERE deleted_at IS NULL;

-- user_roles is placed here because shop_id references shops(id).
CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  role_id     uuid NOT NULL,
  shop_id     uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_role
  ON user_roles (role_id);

-- NULLS NOT DISTINCT (PostgreSQL 15+): NULL shop_id values compare as equal,
-- preventing duplicate global/platform role grants.
CREATE UNIQUE INDEX idx_user_role_scope
  ON user_roles (user_id, role_id, shop_id)
  NULLS NOT DISTINCT;
