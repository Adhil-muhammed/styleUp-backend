-- @rows 1

INSERT INTO shop_gallery (id, shop_id, url, alt_text)
VALUES (
  '456ee8f6-c969-4496-a65f-eea6f76e1325',
  '275fc283-baf6-47df-93bc-970c61b0e465',
  'https://cdn.styleup.example/shops/meeracuts-kochi/storefront.jpg',
  'Storefront of Meera''s Cuts on Bastion Street, Fort Kochi'
)
ON CONFLICT (id) DO NOTHING;
