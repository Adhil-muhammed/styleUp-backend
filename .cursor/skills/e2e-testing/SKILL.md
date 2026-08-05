---
name: e2e-testing
description: >-
  StyleUp NestJS e2e testing playbook — when to write e2e, how to prep/run the
  local stack, and failure triage (truncate seeds, compose env, SMTP boot).
  Use when adding or debugging test/*.e2e-spec.ts, running test:e2e / test:e2e:prep,
  or implementing HTTP/auth/booking/payment features that need integration coverage.
---

# E2E Testing (StyleUp Backend)

Canonical detail for e2e decisions and local-stack pitfalls. The gate and skip policy live in [`.cursor/rules/e2e-testing.mdc`](../../rules/e2e-testing.mdc) — do not soften that gate here.

## Decision table

| Write / update e2e | Skip e2e |
|---|---|
| New or changed public HTTP contract | Pure refactor, no behavior change |
| Auth / payment / booking session flows | Internal helper fully covered by unit tests |
| DB constraint / EXCLUDE / uniqueness that protects races | Scaffolding-only / setup with no feature logic |
| Multi-adapter wiring unit mocks cannot prove | |

Feature work that lands in the left column → add or update `test/*.e2e-spec.ts` (happy path + key `error.code`s).

## Commands

```bash
pnpm run test:e2e:prep   # docker compose --env-file .env.test up postgres/redis + migrate
pnpm run test:e2e        # NODE_ENV=test, jest test/jest-e2e.json --runInBand
pnpm run test:e2e:down   # stop postgres/redis (--env-file .env.test)
```

## Helpers and suites

- Bootstrap: `test/helpers/create-test-app.ts`
- Reset: `truncatePostgres`, `clearRedis`
- Suites: `app.e2e-spec.ts` (health), `bookings-concurrency.e2e-spec.ts` (EXCLUDE race); `auth.e2e-spec.ts` is temporarily `describe.skip`

JWT for authenticated calls: OTP request → verify with `AUTH_OTP_TEST_CODE` from `.env.test`.

## Pitfalls / failure triage (canonical)

| Symptom | Cause | Fix |
|---|---|---|
| OTP verify 500 / `System role "customer" is not seeded` | Truncate wiped Flyway-seeded `roles` | Keep `roles` (and `spatial_ref_sys`, `flyway_schema_history`) in `EXCLUDED_TABLES`; re-seed `customer` if already wiped |
| `smtp.user` does not exist at boot | Nodemailer eagerly constructed without SMTP | AuthModule must construct Nodemailer only when SMTP is set; `.env.test` has no SMTP (console email) |
| Password auth failed for `styleup_test` | Compose interpolated Supabase `.env` over `.env.test` | Always `docker compose --env-file .env.test`; postgres service must not override with `${POSTGRES_*}` from project `.env` |
| `extension "postgis" is not available` | Plain `postgres` image | Use PostGIS image (e.g. `postgis/postgis:16-3.5-alpine`) |
| Jest open handles / hang after suite | App or TypeORM not closed | `await app.close()` in `afterAll`; guard if `beforeAll` failed |

When changing “when to write e2e,” update this table and the e2e-testing **rule** lists together. Pitfall changes belong **only** in this skill.
