-- V2: Drop the scaffold auth_users table and its ENUM type.
-- The production identity model (users + user_identities) is created in V4.

DROP INDEX IF EXISTS auth_users_phone_active_idx;
DROP TABLE IF EXISTS auth_users;
DROP TYPE IF EXISTS auth_user_role;
