---
name: Strip Entity Index Decorators
overview: Remove all TypeORM `@Index` decorators from Postgres entities so Flyway SQL remains the sole source of truth for indexes, replacing each with a short comment.
todos:
  - id: strip-indexes
    content: Remove @Index from all 22 Postgres entities; add short Flyway index comments; drop unused Index imports
    status: completed
  - id: verify-build-lint
    content: Run build + lint; confirm no remaining @Index on entities
    status: completed
isProject: false
---

# Strip TypeORM `@Index` — Flyway Owns Indexes

**Rule:** Indexes are defined only in [`db/migrations/`](db/migrations/). Entity files must not declare `@Index(...)` (including unique/partial/spatial options). Keep a one-line comment naming the Flyway indexes for discoverability.

**Example** ([`user.entity.ts`](src/infra/persistence/postgres/auth/user.entity.ts)):

```typescript
// Indexes (Flyway): idx_users_email, idx_users_phone
@Entity('users')
export class UserEntity { ... }
```

Remove `Index` from the `typeorm` import wherever it becomes unused.

## Files to update (22)

**Auth**

- [`user.entity.ts`](src/infra/persistence/postgres/auth/user.entity.ts) — `idx_users_email`, `idx_users_phone` (V10)
- [`user-identity.entity.ts`](src/infra/persistence/postgres/auth/user-identity.entity.ts)
- [`user-session.entity.ts`](src/infra/persistence/postgres/auth/user-session.entity.ts)
- [`user-role.entity.ts`](src/infra/persistence/postgres/auth/user-role.entity.ts) — also drop the existing “NULLS NOT DISTINCT…” index comment if redundant with the Flyway comment
- [`role.entity.ts`](src/infra/persistence/postgres/auth/role.entity.ts)
- [`permission.entity.ts`](src/infra/persistence/postgres/auth/permission.entity.ts)

**Merchant**

- [`shop.entity.ts`](src/infra/persistence/postgres/merchant/shop.entity.ts)
- [`shop-gallery.entity.ts`](src/infra/persistence/postgres/merchant/shop-gallery.entity.ts)
- [`staff.entity.ts`](src/infra/persistence/postgres/merchant/staff.entity.ts)

**Catalog**

- [`service-category.entity.ts`](src/infra/persistence/postgres/catalog/service-category.entity.ts)
- [`catalog-service.entity.ts`](src/infra/persistence/postgres/catalog/catalog-service.entity.ts)
- [`shop-service.entity.ts`](src/infra/persistence/postgres/catalog/shop-service.entity.ts)
- [`package.entity.ts`](src/infra/persistence/postgres/catalog/package.entity.ts)

**Scheduling**

- [`schedule.entity.ts`](src/infra/persistence/postgres/scheduling/schedule.entity.ts)
- [`schedule-exception.entity.ts`](src/infra/persistence/postgres/scheduling/schedule-exception.entity.ts)

**Transactions**

- [`booking.entity.ts`](src/infra/persistence/postgres/transactions/booking.entity.ts)
- [`booking-item.entity.ts`](src/infra/persistence/postgres/transactions/booking-item.entity.ts)
- [`booking-timeline.entity.ts`](src/infra/persistence/postgres/transactions/booking-timeline.entity.ts)
- [`payment.entity.ts`](src/infra/persistence/postgres/transactions/payment.entity.ts)
- [`refund.entity.ts`](src/infra/persistence/postgres/transactions/refund.entity.ts)
- [`settlement.entity.ts`](src/infra/persistence/postgres/transactions/settlement.entity.ts)
- [`review.entity.ts`](src/infra/persistence/postgres/transactions/review.entity.ts)

**Already clean:** [`customer.entity.ts`](src/infra/persistence/postgres/auth/customer.entity.ts) (no `@Index`; phone index dropped in V10).

## Out of scope

- No Flyway migration changes
- No column/constraint decorator changes (`@Column`, FKs, CHECKs stay as-is)
- EXCLUDE constraints remain migration-only (already not on entities)

## Verify

- `pnpm run build`
- `pnpm run lint`
- Confirm zero `@Index(` matches under `src/infra/persistence/postgres/**/*.entity.ts`
