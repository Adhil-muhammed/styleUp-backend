-- @rows 1
-- Meera's Cuts package bundling the classic men's haircut shop service.

INSERT INTO packages (
  id,
  shop_id,
  name,
  description,
  price_paise,
  is_active
)
VALUES (
  'c0a1b2c3-d4e5-4f60-a708-1920a1b2c3d4',
  '275fc283-baf6-47df-93bc-970c61b0e465',
  'Haircut Combo',
  'Classic men''s haircut at a package rate — wash, cut, and finish.',
  49900,
  TRUE
)
ON CONFLICT (id) DO NOTHING;
