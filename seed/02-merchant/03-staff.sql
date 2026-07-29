-- @rows 1

INSERT INTO staff (
  id,
  user_id,
  shop_id,
  name,
  job_title,
  bio,
  availability_status,
  workflow_status
)
VALUES (
  'dd92d1c8-f3b3-4d97-bca9-47c875a88c43',
  '2f1f32fe-4d0e-4a1f-ab2d-d09d1e4e2b7d',
  '275fc283-baf6-47df-93bc-970c61b0e465',
  'Rahul Menon',
  'Senior Barber',
  'Eight years cutting men''s styles across Ernakulam; specialises in fades and beard trims.',
  'available',
  'active'
)
ON CONFLICT (id) DO NOTHING;
