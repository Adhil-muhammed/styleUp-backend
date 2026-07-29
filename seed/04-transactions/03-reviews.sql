-- @rows 1

INSERT INTO reviews (booking_id, rating, comment)
VALUES (
  '94c892f1-a8c5-4601-be3b-35bee064b3ca',
  5,
  'Rahul gave a clean fade and the Fort Kochi shop was easy to find. Will book again.'
)
ON CONFLICT (booking_id) DO NOTHING;
