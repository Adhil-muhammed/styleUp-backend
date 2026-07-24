# E. Migrations safety

**Why:** Blocking rewrites and non-idempotent DDL break staging/prod.

## Additive NOT NULL (expand → backfill → constrain)

1. Add nullable column.
2. Backfill.
3. Follow-up migration: `SET NOT NULL` (and defaults if needed).

Never add `NOT NULL` without default on a large existing table in one step.

## Destructive changes

`DROP COLUMN` / type narrowing: ship a **rollback migration** and a backfill/verification step before rollout.

## CREATE INDEX CONCURRENTLY

On large tables, create indexes concurrently **outside** a transaction (TypeORM: separate migration / `queryRunner` connection that is not wrapping the DDL in a transaction when Postgres requires it).

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_shop_id
  ON bookings (shop_id);
```

## Idempotent-safe in staging

Prefer `IF NOT EXISTS` / `IF EXISTS` and re-runnable steps so staging can retry without side effects.

## Partitioning

When adding append-only high-growth tables, note partition strategy in the migration PR (even if deferred).
