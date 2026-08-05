-- @rows 1
-- System role required by TypeOrmUserRepository.createCustomerUser (also in V10).

INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
VALUES (
  'c0a10000-0001-4000-8000-000000000001',
  'customer',
  TRUE,
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;
