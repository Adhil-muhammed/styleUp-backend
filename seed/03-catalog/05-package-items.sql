-- @rows 1
-- Links Haircut Combo package to the existing Classic Men's Haircut shop_service.

INSERT INTO package_items (
  package_id,
  shop_service_id
)
VALUES (
  'c0a1b2c3-d4e5-4f60-a708-1920a1b2c3d4',
  'e018d76c-af04-4524-a64e-058fb2a02bef'
)
ON CONFLICT (package_id, shop_service_id) DO NOTHING;
