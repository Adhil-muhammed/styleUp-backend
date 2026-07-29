-- @rows 1
-- ₹299.00 → 29900 paise; 30-minute slot.

INSERT INTO shop_services (
  id,
  shop_id,
  catalog_service_id,
  price_paise,
  duration_minutes,
  is_active,
  sort_order
)
VALUES (
  'e018d76c-af04-4524-a64e-058fb2a02bef',
  '275fc283-baf6-47df-93bc-970c61b0e465',
  '66e42043-f4e7-433d-abfb-933d9563d387',
  29900,
  30,
  TRUE,
  1
)
ON CONFLICT (shop_id, catalog_service_id) DO NOTHING;
