-- V6: Catalog tables: service_categories, catalog_services, shop_services,
--     packages, package_items.

CREATE TABLE service_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       varchar(64) NOT NULL,
  name       varchar(64) NOT NULL,
  icon_url   varchar(512),
  banner_url varchar(512),
  status     varchar(32) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_service_categories_status
    CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX idx_categories_slug
  ON service_categories (slug);

CREATE TABLE catalog_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL,
  name          varchar(128) NOT NULL,
  target_gender varchar(16) NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT TRUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT fk_catalog_services_category
    FOREIGN KEY (category_id) REFERENCES service_categories (id) ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_services_target_gender
    CHECK (target_gender IN ('male', 'female', 'unisex'))
);

CREATE INDEX idx_catalog_services_category
  ON catalog_services (category_id, is_active);

CREATE TABLE shop_services (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id            uuid NOT NULL,
  catalog_service_id uuid NOT NULL,
  price_paise        bigint NOT NULL,
  duration_minutes   int NOT NULL,
  is_active          boolean NOT NULL DEFAULT TRUE,
  sort_order         int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_shop_services_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_services_catalog_service
    FOREIGN KEY (catalog_service_id) REFERENCES catalog_services (id) ON DELETE RESTRICT,
  CONSTRAINT chk_shop_services_price_paise CHECK (price_paise > 0),
  CONSTRAINT chk_shop_services_duration_minutes CHECK (duration_minutes > 0)
);

-- Prevents a shop from listing the same catalog service twice.
CREATE UNIQUE INDEX idx_shop_services_unique
  ON shop_services (shop_id, catalog_service_id);

-- Active service listing, ordered by sort_order.
CREATE INDEX idx_shop_services_lookup
  ON shop_services (shop_id, is_active, sort_order);

-- Reverse lookup: all shops offering a specific catalog service.
CREATE INDEX idx_shop_services_search
  ON shop_services (catalog_service_id, is_active);

CREATE TABLE packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL,
  name        varchar(128) NOT NULL,
  description text,
  price_paise bigint NOT NULL,
  is_active   boolean NOT NULL DEFAULT TRUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_packages_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT chk_packages_price_paise CHECK (price_paise > 0)
);

CREATE INDEX idx_packages_shop
  ON packages (shop_id, is_active);

-- package_items: composite PK; no separate id column needed.
CREATE TABLE package_items (
  package_id      uuid NOT NULL,
  shop_service_id uuid NOT NULL,
  CONSTRAINT pk_package_items PRIMARY KEY (package_id, shop_service_id),
  CONSTRAINT fk_package_items_package
    FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE,
  CONSTRAINT fk_package_items_shop_service
    FOREIGN KEY (shop_service_id) REFERENCES shop_services (id) ON DELETE CASCADE
);
