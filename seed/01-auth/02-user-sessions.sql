-- @rows 1
-- Refresh token stored as sha256 hex (matches app TokenService hashing shape).

INSERT INTO user_sessions (id, user_id, device_id, refresh_token, expires_at, is_revoked)
VALUES (
  '6d3fd872-cd34-43d2-aa5d-057a17178f07',
  '8db1145b-aff5-4be1-a890-2f82784741e4',
  'pixel-8-kochi-arjun',
  'a3f1c8e2b7d94e6a1c0f5b8d2e7a9c4f6b1d8e3a5c7f0b2d4e6a8c1f3b5d7e9a',
  '2027-06-30T18:30:00+05:30',
  FALSE
)
ON CONFLICT (refresh_token) DO NOTHING;
