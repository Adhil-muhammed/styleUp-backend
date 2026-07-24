# D. Normalization & schema design

**Why:** Drift and silent cascades delete or desync money/history.

## No silent multi-hop CASCADE

Flag `ON DELETE CASCADE` chains A→B→C. Prefer `RESTRICT` / `SET NULL` with explicit soft-delete. Document any intentional single-hop cascade.

## Derived-column drift

If a column is computable from others (e.g. `duration_minutes` alongside `scheduled_start` / `scheduled_end`), it must be a **generated column** or **trigger-synced** — never manually updated in app code alone.

```sql
-- BAD: app writes duration_minutes independently → drifts from start/end
duration_minutes integer NOT NULL

-- GOOD: generated (Postgres)
duration_minutes integer GENERATED ALWAYS AS (
  (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60)::integer
) STORED
```

## No duplicated source of truth

Duplicated data across tables needs an explicit sync mechanism (trigger, job, or single owner). Otherwise store once and join.

## JSONB only when schema-less

Structured fields (status, amounts, FKs, times) are real columns. JSONB for genuinely flexible payloads (e.g. provider-specific metadata) — justify in migration comment.

## Multi-tenancy

Every tenant-scoped table: `shop_id` **present and indexed**. Flag tables that look shop-scoped but omit it.
