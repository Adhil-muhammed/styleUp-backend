-- V11: Discovery feature — new columns on shops, staff, catalog_services,
--      home_banners table, and supporting indexes.
--
-- Rating recomputation (avg_rating / review_count) is maintained by the
-- application-layer BullMQ shop-rating queue (RatingProcessor), NOT by a
-- DB trigger. A one-time back-fill at the end of this file seeds the columns
-- for any reviews that already exist before this migration is applied.

-- ────────────────────────────────────────────────────────────────────────────
-- shops: discovery columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE shops ADD COLUMN cover_image_url     varchar(512);
ALTER TABLE shops ADD COLUMN service_radius_meters int;
ALTER TABLE shops ADD COLUMN avg_rating           numeric(3,2) NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN review_count         int          NOT NULL DEFAULT 0;

ALTER TABLE shops
  ADD CONSTRAINT chk_shops_service_radius_meters
    CHECK (service_radius_meters IS NULL OR service_radius_meters > 0);

ALTER TABLE shops
  ADD CONSTRAINT chk_shops_avg_rating
    CHECK (avg_rating BETWEEN 0 AND 5);

ALTER TABLE shops
  ADD CONSTRAINT chk_shops_review_count
    CHECK (review_count >= 0);

-- ────────────────────────────────────────────────────────────────────────────
-- staff: photo column
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE staff ADD COLUMN avatar_url varchar(512);

-- ────────────────────────────────────────────────────────────────────────────
-- catalog_services: quick-book display columns
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE catalog_services ADD COLUMN image_url varchar(512);
ALTER TABLE catalog_services ADD COLUMN badge     varchar(64);

-- ────────────────────────────────────────────────────────────────────────────
-- home_banners: campaign promo block on the Home tab
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE home_banners (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_label varchar(128) NOT NULL,
  subtitle       varchar(256) NOT NULL,
  image_url      varchar(512) NOT NULL,
  cta_label      varchar(64)  NOT NULL,
  is_active      boolean      NOT NULL DEFAULT TRUE,
  valid_from     timestamptz  NOT NULL,
  valid_until    timestamptz  NOT NULL,
  sort_order     int          NOT NULL DEFAULT 0,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT chk_home_banners_validity
    CHECK (valid_until > valid_from)
);

-- Partial index: only actively-running banners need lookup; scans skip
-- inactive/expired rows at the storage level.
CREATE INDEX idx_home_banners_active
  ON home_banners (sort_order, valid_from, valid_until)
  WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────────────────────
-- shops: rating sort index for popular-salons list
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_shops_rating
  ON shops (avg_rating DESC, review_count DESC)
  WHERE deleted_at IS NULL AND status = 'approved';

-- ────────────────────────────────────────────────────────────────────────────
-- One-time back-fill: seed avg_rating / review_count from existing reviews.
-- Runs once at migration time only. Ongoing updates are handled by the
-- application-layer BullMQ RatingProcessor.
-- ────────────────────────────────────────────────────────────────────────────

UPDATE shops s
   SET avg_rating   = COALESCE(sub.avg_r, 0),
       review_count = COALESCE(sub.cnt, 0),
       updated_at   = now()
  FROM (
    SELECT b.shop_id,
           AVG(r.rating)::numeric(3,2) AS avg_r,
           COUNT(*) AS cnt
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
     GROUP BY b.shop_id
  ) sub
 WHERE s.id = sub.shop_id;
