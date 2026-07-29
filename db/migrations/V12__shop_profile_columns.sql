-- V12: Shop Profile & Service Selection — display columns for about,
--      package media/subtitle, and ordered gallery.

ALTER TABLE shops ADD COLUMN about text;

ALTER TABLE packages ADD COLUMN subtitle varchar(256);
ALTER TABLE packages ADD COLUMN image_url varchar(512);
ALTER TABLE packages ADD COLUMN detail_image_url varchar(512);

ALTER TABLE shop_gallery ADD COLUMN sort_order int NOT NULL DEFAULT 0;

CREATE INDEX idx_shop_gallery_shop_sort
  ON shop_gallery (shop_id, sort_order);
