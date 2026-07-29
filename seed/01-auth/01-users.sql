-- @rows 3
-- Stable seed users: customer, shop owner, staff member.
-- V10: phone lives on users (not customers); email OR phone required.
-- password_hash is a shared bcrypt hash (cost 10) for local seed logins.

INSERT INTO users (
  id,
  email,
  phone,
  password_hash,
  is_active,
  email_verified_at,
  phone_verified_at
)
VALUES
  (
    '8db1145b-aff5-4be1-a890-2f82784741e4',
    'arjun.nair@example.com',
    '+919876543210',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    '2026-06-01T09:00:00+05:30',
    '2026-06-01T09:05:00+05:30'
  ),
  (
    '2fd0cff9-b6ff-4bb4-8742-1dc0976e055a',
    'meera.owner@styleup.example',
    '+919847001122',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    '2026-05-15T11:00:00+05:30',
    '2026-05-15T11:02:00+05:30'
  ),
  (
    '2f1f32fe-4d0e-4a1f-ab2d-d09d1e4e2b7d',
    'rahul.barber@styleup.example',
    '+919895667788',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    TRUE,
    '2026-05-20T14:00:00+05:30',
    '2026-05-20T14:01:00+05:30'
  )
ON CONFLICT (id) DO NOTHING;
