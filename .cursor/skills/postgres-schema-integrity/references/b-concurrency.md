# B. Concurrency & scheduling integrity

**Why:** Two confirmed bookings for the same staff slot is a correctness failure, not a UX bug.

## EXCLUDE + btree_gist (overlap per resource)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- BAD: only app-level slot check
-- GOOD
ALTER TABLE bookings ADD CONSTRAINT ex_bookings_staff_no_overlap
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
)
WHERE (deleted_at IS NULL AND status <> 'cancelled');
```

Partial predicate keeps soft-deleted/cancelled rows out of uniqueness/overlap checks.

## Optimistic locking

```sql
version integer NOT NULL DEFAULT 1
```

```typescript
@VersionColumn({ name: 'version', type: 'int', default: 1 })
version!: number;
```

Required on concurrent-write rows: **bookings**, **payments**.

## FOR UPDATE — document lock order

In adapters, comment the lock order to avoid deadlocks (e.g. lock **booking** then **payment**). Never invent ad-hoc lock orders per call site.

```typescript
// Lock order: booking → payment (never reverse)
await manager
  .createQueryBuilder(BookingEntity, 'b')
  .setLock('pessimistic_write')
  .where('b.id = :id', { id })
  .getOne();
```
