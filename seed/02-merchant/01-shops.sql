-- @rows 1
-- Kochi Fort area — GeoJSON order: longitude, latitude.

INSERT INTO shops (
  id,
  owner_id,
  name,
  email,
  phone,
  city,
  address,
  location,
  status,
  is_featured
)
VALUES (
  '275fc283-baf6-47df-93bc-970c61b0e465',
  '2fd0cff9-b6ff-4bb4-8742-1dc0976e055a',
  'Meera''s Cuts Kochi',
  'hello@meeracuts.example',
  '+914843212345',
  'Kochi',
  '12/445, Bastion Street, Fort Kochi, Kochi, Kerala 682001',
  ST_SetSRID(ST_MakePoint(76.2673, 9.9312), 4326)::geography,
  'approved',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
