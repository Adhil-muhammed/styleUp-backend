-- @rows 1
-- Default Google Pay wallet for seed customer Arjun Nair (bookings Swagger / local dev).

INSERT INTO payment_methods (
  id,
  user_id,
  kind,
  label,
  is_default
)
VALUES (
  'f1a2b3c4-d5e6-4789-a012-3456789abcde',
  '8db1145b-aff5-4be1-a890-2f82784741e4',
  'google_pay',
  'Google Pay',
  TRUE
)
ON CONFLICT (id) DO NOTHING;
