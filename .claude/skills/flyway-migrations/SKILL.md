---
name: flyway-migrations
description: >-
  Flyway SQL migration conventions for StyleUp NestJS + TypeORM + Supabase (PostgreSQL).
  Use when writing, reviewing, or planning any database schema change: new tables,
  columns, indexes, constraints, renames, or drops. Also use for CI/CD migration
  pipeline questions and local dev workflow guidance.
---

# Flyway Migration Conventions — StyleUp Backend

## Project Setup

- **Tool:** Flyway via `node-flywaydb` (npm package; CLI binary is named `flyway`)
- **Config:** [`flyway.config.js`](../../../flyway.config.js) at project root — reads `DATABASE_URL` (preferred) or `POSTGRES_*` env vars; no new env keys needed
- **Migration files:** `db/migrations/V<version>__<snake_case_description>.sql` (pure SQL, no TypeScript wrappers)
- **ORM:** TypeORM entities in `src/infra/persistence/postgres/` remain for query building and `@Column` mapping — they do **not** manage schema
- **`synchronize: false`** is set in both `data-source.ts` and `postgres.module.ts` — ORM never auto-syncs schema

## Scripts

| Command | Purpose |
|---|---|
| `pnpm migrate` | Apply all pending migrations |
| `pnpm migrate:info` | Show migration status (pending / applied / failed) |
| `pnpm migrate:validate` | Validate checksums of applied migrations — run before deploy |
| `pnpm migrate:repair` | Repair the `flyway_schema_history` table (fix failed migrations) |

## 9 Rules

### Rule 1 — Every schema change needs a Flyway SQL file

Any new table, column, index, constraint, type, or extension must have a corresponding `db/migrations/V<n>__*.sql` file. Never rely on:
- TypeORM `synchronize: true` (disabled globally)
- Manual `ALTER TABLE` run directly against the database
- TypeORM CLI `migration:run` (removed — Flyway is the sole runner)

### Rule 2 — File naming: strictly incrementing integer versions, never reused

```
db/migrations/
  V1__create_auth_users_table.sql
  V2__drop_auth_users_scaffold.sql
  V3__enable_schema_extensions.sql
  ...
  V9__add_missing_fk_indexes_and_version_columns.sql
  V10__<snake_case_description>.sql   ← next migration
```

- Version is a plain integer (`V10`, `V11`, …) — never decimals, timestamps, or gaps
- Description is `snake_case`; double underscore (`__`) separates version from description
- Flyway rejects out-of-order versions (`outOfOrder: false` in config)
- Once a file is committed and applied, **its version number and filename are permanent**

### Rule 3 — Never edit an applied migration

Once a migration has been applied to any environment (local, staging, production), its SQL and filename must not change. Flyway validates checksums on every `migrate` run; any modification will fail with a checksum mismatch.

To fix a mistake in an applied migration: write a **new** migration that corrects it.

```
-- WRONG: edit V7__create_scheduling_tables.sql after it was applied
-- RIGHT: create V11__fix_schedule_exception_index.sql
ALTER INDEX idx_exceptions_tenant_time RENAME TO idx_exceptions_lookup;
```

### Rule 4 — Migration authoring order

Write each migration in this order to avoid dependency failures:

1. `CREATE EXTENSION` / `CREATE TYPE` (if new types needed)
2. `CREATE TABLE` with all columns, correct types, defaults, and nullability
3. Primary key (inline `PRIMARY KEY` or `CONSTRAINT pk_<table> PRIMARY KEY`)
4. Foreign key constraints (`CONSTRAINT fk_<table>_<ref> FOREIGN KEY … ON DELETE …`)
5. Check constraints (`CONSTRAINT chk_<table>_<col> CHECK (…)`)
6. Indexes (one `CREATE INDEX` statement per index, after the table)
7. `ALTER TABLE` for constraints added after the fact (e.g., `EXCLUDE`)

### Rule 5 — SQL column names are snake_case; TypeORM entity uses `@Column({ name })`

SQL is the source of truth for column names. TypeORM entity properties use camelCase and declare the DB column name explicitly.

```typescript
// TypeORM entity — src/infra/persistence/postgres/transactions/booking.entity.ts
@Column({ name: 'booking_status', length: 32 })
bookingStatus: string;

@Column({ name: 'total_price_paise', type: 'bigint' })
totalPricePaise: bigint;

@Column({ name: 'scheduled_start', type: 'timestamptz' })
scheduledStart: Date;
```

```sql
-- SQL migration — db/migrations/V8__create_transaction_tables.sql
CREATE TABLE bookings (
  booking_status    varchar(32) NOT NULL,
  total_price_paise bigint NOT NULL,
  scheduled_start   timestamptz NOT NULL,
  ...
);
```

### Rule 6 — Every foreign key column gets an index

Every column referenced by a `FOREIGN KEY` constraint must have a dedicated index unless:
- A composite index exists that has the FK column as its **leading** column, or
- You explicitly document why the index is omitted (e.g., a lookup-only reference on a tiny table)

```sql
-- BAD: FK without index
CONSTRAINT fk_booking_items_staff FOREIGN KEY (staff_id) REFERENCES staff (id)
-- (no index on staff_id)

-- GOOD: FK with index
CONSTRAINT fk_booking_items_staff FOREIGN KEY (staff_id) REFERENCES staff (id)
...
CREATE INDEX idx_booking_items_staff ON booking_items (staff_id);
```

Exception pattern already in codebase: `idx_user_role_scope ON user_roles (user_id, role_id, shop_id)` covers `user_id` (leading column) but not `role_id` alone — hence `idx_user_roles_role ON user_roles (role_id)` was added separately.

### Rule 7 — Destructive changes use a two-step migration

Flyway CE has no rollback. Destructive DDL (DROP COLUMN, DROP TABLE, type narrowing, constraint tightening on populated columns) must be split across two releases:

**Release N — Deprecate and backfill:**
```sql
-- V12__deprecate_shop_phone_column.sql
-- Mark column as deprecated: application stops writing to it.
-- No DROP yet — app reads from new column, falls back to old.
ALTER TABLE shops ADD COLUMN contact_phone varchar(32);
UPDATE shops SET contact_phone = phone WHERE contact_phone IS NULL;
```

**Release N+1 — Drop:**
```sql
-- V14__drop_deprecated_shop_phone_column.sql
-- Drop only after confirming no reads/writes to the old column for ≥ 1 deploy cycle.
ALTER TABLE shops DROP COLUMN phone;
```

Type narrowing (e.g., `varchar(255)` → `varchar(32)`) follows the same pattern: add new column, backfill, swap application writes, then drop old.

### Rule 8 — Local dev flow

```
1. Write or update the TypeORM entity in src/infra/persistence/postgres/<domain>/
2. Create db/migrations/V<n>__<description>.sql with the required DDL
3. pnpm migrate              → apply the migration
4. pnpm migrate:info         → confirm the new version shows "Success"
5. Commit both files together (entity + SQL migration in the same commit)
```

### Rule 9 — CI/CD: migrations run before app boot, never inside app startup

In CI and deployment pipelines, `pnpm migrate` must run as a **separate step** before the application process starts. It must not be called from `main.ts`, `AppModule.onApplicationBootstrap`, or any NestJS lifecycle hook.

```yaml
# Example GitHub Actions step order
- name: Run database migrations
  run: pnpm migrate
- name: Start application
  run: pnpm start:prod
```

The NestJS `PostgresModule` has `migrations: []` — TypeORM will never try to run migrations at boot time.

---

## Reference Examples

These three files demonstrate the full convention set on real schema from this project.

### Example 1 — V4: Identity tables (table + FK + CHECK + partial index)

Key patterns: UUID PK with `gen_random_uuid()`, explicit `ON DELETE`, `CHECK` for enum columns, partial unique index (`WHERE deleted_at IS NULL`), FK indexes immediately after each table.

```sql
-- db/migrations/V4__create_identity_tables.sql (excerpt)

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          varchar(255) NOT NULL,
  password_hash  varchar(255),
  is_active      boolean NOT NULL DEFAULT TRUE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

-- Partial unique index: email must be unique among non-deleted users.
CREATE UNIQUE INDEX idx_users_email
  ON users (email)
  WHERE deleted_at IS NULL;

CREATE TABLE user_identities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  provider     varchar(32) NOT NULL,
  provider_id  varchar(255) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_identities_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_user_identities_provider
    CHECK (provider IN ('google', 'apple', 'facebook'))
);

CREATE INDEX idx_user_identities_user ON user_identities (user_id);
CREATE UNIQUE INDEX idx_user_identities_provider ON user_identities (provider, provider_id);
```

### Example 2 — V5: Merchant tables (PostGIS geography, NULLS NOT DISTINCT)

Key patterns: `geography(Point, 4326)` column with `USING GIST` spatial index, composite partial index for filtered list queries, `NULLS NOT DISTINCT` unique index for nullable columns (PostgreSQL 15+).

```sql
-- db/migrations/V5__create_merchant_tables.sql (excerpt)

CREATE TABLE shops (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  location geography(Point, 4326) NOT NULL,
  status   varchar(32) NOT NULL,
  ...
  CONSTRAINT fk_shops_owner  FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_shops_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'))
);

CREATE INDEX idx_shops_owner        ON shops (owner_id);
CREATE INDEX idx_shops_location     ON shops USING GIST (location);
CREATE INDEX idx_shops_city_status  ON shops (city, status) WHERE deleted_at IS NULL;

-- NULLS NOT DISTINCT: NULL shop_id values compare as equal,
-- preventing duplicate global/platform role grants.
CREATE UNIQUE INDEX idx_user_role_scope
  ON user_roles (user_id, role_id, shop_id)
  NULLS NOT DISTINCT;
```

### Example 3 — V7: Scheduling tables (EXCLUDE constraints)

Key patterns: `EXCLUDE USING gist` with `btree_gist` for UUID/integer equality, `timerange` custom type for time overlap detection, `tstzrange` (not `tsrange`) for `timestamptz` columns, partial EXCLUDE with `WHERE` clause.

```sql
-- db/migrations/V7__create_scheduling_tables.sql (excerpt)

-- Prevents two open windows from overlapping for the same shop + staff + weekday.
ALTER TABLE schedules
  ADD CONSTRAINT ex_schedules_no_overlap
  EXCLUDE USING gist (
    shop_id     WITH =,
    staff_id    WITH =,
    day_of_week WITH =,
    (tsrange(effective_from::timestamp, effective_to::timestamp)) WITH &&,
    (timerange(start_time, end_time)) WITH &&
  )
  WHERE (is_closed = FALSE);

-- DEVIATION: use tstzrange (not tsrange) for timestamptz columns.
-- Casting timestamptz → timestamp inside GiST EXCLUDE is STABLE (TZ-dependent)
-- and Postgres rejects it. tstzrange is immutable and correct.
ALTER TABLE schedule_exceptions
  ADD CONSTRAINT ex_schedule_exceptions_staff_scope
  EXCLUDE USING gist (
    shop_id  WITH =,
    staff_id WITH =,
    (tstzrange(start_timestamp, end_timestamp)) WITH &&
  )
  WHERE (scope = 'staff' AND workflow_status IN ('approved', 'pending'));
```

---

## First-Time Setup on an Existing Database

If the database already had the TypeORM migrations applied (V1–V9 state), tell Flyway to start tracking from V9 without re-running anything:

```bash
# Option A: baseline at V9 (most common — DB already has the full schema)
pnpm exec flyway -c flyway.config.js baseline -baselineVersion=9 -baselineDescription="TypeORM migration history baseline"

# Option B: repair after manually inserting history rows
pnpm migrate:repair

# Verify
pnpm migrate:info   # V1–V9 should show as "Baseline" or "Success"
```

After baselining, `pnpm migrate` will only apply V10+.

## Checklist for Every New Migration

Before committing a new `db/migrations/V<n>__*.sql` file:

- [ ] Version number is the next integer after the highest existing file
- [ ] Filename is `V<n>__<snake_case>.sql` — no spaces, no camelCase
- [ ] All FK columns have a matching `CREATE INDEX` in the same file
- [ ] Money columns use `bigint` with `*_paise` suffix — no `numeric` or `float`
- [ ] All timestamps use `timestamptz` — no bare `timestamp`
- [ ] Status columns have a `CONSTRAINT chk_<table>_<col> CHECK (col IN (…))`
- [ ] `ON DELETE` is explicit on every `FOREIGN KEY`
- [ ] Destructive change? Two-step plan documented (see Rule 7)
- [ ] `pnpm migrate` runs cleanly on local dev DB
- [ ] `pnpm migrate:info` shows the new migration as `Success`
- [ ] TypeORM entity updated with `@Column({ name: 'col_name' })` for any new column
