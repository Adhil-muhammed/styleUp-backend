-- @rows 1
-- Service path only: shop_service_id set, package_id NULL (XOR check).

INSERT INTO booking_items (
  id,
  booking_id,
  staff_id,
  shop_service_id,
  package_id,
  scheduled_start,
  scheduled_end,
  duration_minutes,
  unit_price_paise,
  item_status
)
VALUES (
  'bb32c9d1-3ef6-4fce-8148-fbe3a4c8595f',
  '94c892f1-a8c5-4601-be3b-35bee064b3ca',
  'dd92d1c8-f3b3-4d97-bca9-47c875a88c43',
  'e018d76c-af04-4524-a64e-058fb2a02bef',
  NULL,
  '2026-07-20T10:00:00+05:30',
  '2026-07-20T10:30:00+05:30',
  30,
  29900,
  'completed'
)
ON CONFLICT (id) DO NOTHING;
