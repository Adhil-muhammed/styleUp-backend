# Seed Directory Reference

Maps `seed/` SQL files to Postgres tables. Use when writing e2e inline seed or demo data.

**Canonical schema:** `db/migrations/V*.sql` (Flyway). **E2e rule:** [`.cursor/rules/e2e-seed-schema.mdc`](rules/e2e-seed-schema.mdc).

## Run

```bash
pnpm seed   # uses .env / DATABASE_URL — not .env.test
```

E2e tests use **inline SQL** in `test/*.e2e-spec.ts` after `truncatePostgres`; those INSERTs must use the same table/column names as below.

## Folder map

| Folder | SQL files (order) | Postgres tables |
|---|---|---|
| `seed/01-auth/` | `00-roles.sql`, `01-users.sql`, `02-user-sessions.sql`, `03-customers.sql` | `roles`, `users`, `user_sessions`, `customers` |
| `seed/02-merchant/` | `01-shops.sql`, `02-shop-gallery.sql`, `03-staff.sql`, `04-schedules.sql` | `shops`, `shop_gallery`, `staff`, `schedules` (+ PostGIS on `shops.location`) |
| `seed/03-catalog/` | `01-service-categories.sql` … `05-package-items.sql` | `service_categories`, `catalog_services`, `shop_services`, `packages`, `package_items` |
| `seed/04-transactions/` | `01-bookings.sql` … `04-payment-methods.sql` | `bookings`, `booking_items`, `reviews`, `payment_methods` |

## API name vs DB name

| Mobile / API concept | Postgres table |
|---|---|
| Categories (discovery) | `service_categories` |
| Service / variant | `catalog_services` + `shop_services` |
| Customer profile | `customers` (join `users` for email/phone) |
| Booking | `bookings` + `booking_items` |

## E2e reference suites

| Domain | Copy seed pattern from |
|---|---|
| Auth + OTP | `test/bookings-payment.e2e-spec.ts` (OTP setup) |
| Catalog + booking + pay | `test/bookings-payment.e2e-spec.ts` (lines ~86–125) |
| Bookings list / profile | `test/bookings-profile.e2e-spec.ts` (after seed fix) |
| Slot concurrency | `test/bookings-concurrency.e2e-spec.ts` |

## Seeder entrypoint

`seed/seeder.js` — runs all `seed/*/*.sql` in numeric folder order; idempotent (`ON CONFLICT` where used).
