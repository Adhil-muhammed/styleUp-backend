---
name: testing-workflow
description: Guidance for writing, running, and debugging Jest unit and e2e tests in this NestJS backend. Use when the user asks for test setup, test-writing conventions, or when Jest/e2e behavior needs troubleshooting.
---

# Testing Workflow (StyleUp Backend)

This skill standardizes how tests are authored and verified in this repository.

## Quick Start

1. Decide **unit vs e2e**:
   - **Unit**: service-layer business logic; mock port tokens (never DB/Redis clients directly).
   - **E2E**: controller → service → adapters with real HTTP + real dependencies via `docker-compose` + Flyway.
2. Write the test following the patterns below.
3. Run verification in order (fastest first):
   - `pnpm test` (unit)
   - `pnpm run test:e2e:prep` then `pnpm run test:e2e` (e2e)
   - `pnpm run build` and `pnpm run lint` if you made configuration changes

## Making the Unit/E2E Decision

Use **unit tests** when:
- The change affects core domain/service behavior (OTP rate limiting, token revocation logic, conflict handling, etc.).
- You can model the dependency boundaries with the existing ports in `src/modules/auth/ports`.

Use **e2e tests** when:
- You need to validate the full HTTP request/response envelope and the wiring between modules/adapters.
- You need confidence that migrations + real DB/Redis + controller DTO validation behave correctly together.

Use both when:
- The unit test proves the logic, and the e2e test proves the integration.

## Unit Test Pattern (Mock Hexagonal Ports)

1. Create a Nest testing module with `@nestjs/testing`.
2. Provide the service under test (e.g. `AuthService`).
3. Provide **mock implementations for port tokens** only.
4. Do not import TypeORM/Mongoose models directly in unit tests.

Repo references:
- Service-layer unit tests: `src/modules/auth/auth.service.spec.ts`
- Port-token interfaces and tokens: `src/modules/auth/ports/*`
- Typed factories for readable tests: `test/factories/auth-test-factories.ts`

## E2E Pattern (Real HTTP + Real Local Stack)

1. Start dependencies and run migrations:
   - `pnpm run test:e2e:prep`
2. Run e2e:
   - `pnpm run test:e2e`
3. Use supertest against the Nest app:
   - Tests should call endpoints under the global prefix `/api/v1/...`.

Repo references:
- E2E app bootstrap: `test/helpers/create-test-app.ts` (mirrors `src/main.ts`)
- E2E helpers:
  - `test/helpers/postgres-test-utils.ts` (truncate between tests)
  - `test/helpers/redis-test-utils.ts` (flush Redis between tests)
- Example e2e suite: `test/auth.e2e-spec.ts`

Deterministic OTP for e2e:
- OTP codes are normally random and hashed in Redis.
- For repeatable e2e, the repo uses a test-only env override `AUTH_OTP_TEST_CODE` gated behind `NODE_ENV=test`.

## Failure Handling (Be Explicit)

If a task requires external services and they are not available:
- Do not silently skip the e2e work.
- Report which stage failed (`test:e2e:prep` vs `test:e2e`) and what command/output is needed to fix it.

## Verification Checklist

When you finish adding/changing tests, ensure:
- `pnpm test` passes for unit tests
- `pnpm run test:e2e:prep` succeeds (if e2e was changed)
- `pnpm run test:e2e` passes (if e2e was changed)
- Lint/build remain clean if you touched configuration

