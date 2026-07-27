-- V10: Move login contacts onto users; drop customers.phone; seed customer role.
-- Expand → normalize/dedupe → backfill → constrain → drop.

-- 1–3. Expand users with phone + verification timestamps.
ALTER TABLE users ADD COLUMN phone varchar(32);
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN phone_verified_at timestamptz;

-- 4a. Normalize empty-string phones on customers ('' is not NULL).
UPDATE customers
SET phone = NULLIF(BTRIM(phone), '')
WHERE phone IS NOT NULL;

-- 4b. Deduplicate phones: keep oldest customer row per phone; null the rest.
WITH keepers AS (
  SELECT DISTINCT ON (phone) user_id
  FROM customers
  WHERE phone IS NOT NULL
  ORDER BY phone, created_at ASC, user_id ASC
)
UPDATE customers c
SET phone = NULL
WHERE c.phone IS NOT NULL
  AND c.user_id NOT IN (SELECT user_id FROM keepers);

-- 4c. Backfill phone onto users (empty strings → NULL).
UPDATE users u
SET phone = NULLIF(BTRIM(c.phone), '')
FROM customers c
WHERE c.user_id = u.id
  AND u.phone IS NULL;

-- 4d. Scrub any empty strings that may already sit on users.phone.
UPDATE users
SET phone = NULL
WHERE phone IS NOT NULL
  AND BTRIM(phone) = '';

-- 4e. Assert zero duplicate active phones before unique index.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE phone IS NOT NULL
      AND deleted_at IS NULL
    GROUP BY phone
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'V10 abort: duplicate phones remain on users after dedupe — resolve manually before migrate';
  END IF;
END $$;

-- 5. Allow phone-only accounts.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- 6. At least one login contact required.
ALTER TABLE users
  ADD CONSTRAINT chk_users_has_contact
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- 7. Replace email unique index: ignore soft-deleted and NULL emails.
DROP INDEX idx_users_email;
CREATE UNIQUE INDEX idx_users_email
  ON users (email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- 8. Unique phone among active users.
CREATE UNIQUE INDEX idx_users_phone
  ON users (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;

-- 9. customers is profile/gamification only — drop login phone.
DROP INDEX idx_customers_phone;
ALTER TABLE customers DROP COLUMN phone;

-- 10. Seed platform customer role (idempotent).
INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
SELECT gen_random_uuid(), 'customer', TRUE, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE name = 'customer'
);
