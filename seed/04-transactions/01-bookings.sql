-- @rows 1
-- Completed paid booking; version defaults to 1 (V9).

INSERT INTO bookings (
  id,
  shop_id,
  customer_id,
  booking_status,
  payment_status,
  scheduled_start,
  scheduled_end,
  total_price_paise,
  customer_notes
)
VALUES (
  '94c892f1-a8c5-4601-be3b-35bee064b3ca',
  '275fc283-baf6-47df-93bc-970c61b0e465',
  '8db1145b-aff5-4be1-a890-2f82784741e4',
  'completed',
  'paid',
  '2026-07-20T10:00:00+05:30',
  '2026-07-20T10:30:00+05:30',
  29900,
  'Please keep the sides short; no product on top.'
)
ON CONFLICT (id) DO NOTHING;
