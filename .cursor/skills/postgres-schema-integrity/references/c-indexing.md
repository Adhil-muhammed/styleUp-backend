# C. Indexing & performance

**Why:** Postgres does **not** auto-index FKs; calendar/availability paths are hot.

## Every FK indexed

```sql
CREATE INDEX idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX idx_bookings_staff_id ON bookings (staff_id);
CREATE INDEX idx_bookings_shop_id ON bookings (shop_id);
```

## Composite order matches filter/sort (cursor)

Cursor feeds sort by time then id — index must match:

```sql
-- Calendar / availability cursor: shop → starts_at DESC → id DESC
CREATE INDEX idx_bookings_shop_starts_id
  ON bookings (shop_id, starts_at DESC, id DESC);
```

## Partial indexes for skewed status/flags

```sql
CREATE INDEX idx_bookings_shop_active
  ON bookings (shop_id, starts_at)
  WHERE deleted_at IS NULL AND status IN ('pending', 'confirmed');
```

## ORM N+1 and covering indexes

- Flag missing `relations` / joins in TypeORM repositories on list/calendar paths.
- Flag missing covering indexes for hot reads (calendar views, availability lookups).
- Deep perf: see the sibling `supabase-postgres-best-practices` skill.

## Partitioning candidates

Flag high-growth **append-only** tables (`audit_logs`, `notifications`) for range/hash partitioning — do not partition transactional booking tables without analysis.
