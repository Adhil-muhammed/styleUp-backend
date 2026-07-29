-- @rows 1
-- Profile/gamification only (V10 dropped customers.phone).

INSERT INTO customers (
  user_id,
  display_name,
  nickname,
  date_of_birth,
  gender,
  country,
  xp_points,
  membership_level
)
VALUES (
  '8db1145b-aff5-4be1-a890-2f82784741e4',
  'Arjun Nair',
  'Arjun',
  '1996-03-14',
  'male',
  'India',
  120,
  2
)
ON CONFLICT (user_id) DO NOTHING;
