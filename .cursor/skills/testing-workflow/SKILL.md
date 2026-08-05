---
name: testing-workflow
description: >-
  Guidance for writing, running, and verifying Jest unit tests in this NestJS
  backend. Use when implementing a feature, adding a controller or service, or
  finishing a module. For e2e decisions, prep/run, and pitfalls, use the
  e2e-testing skill.
---

# Testing Workflow (StyleUp Backend)

This skill standardizes how tests are authored and verified in this repository.

## Mandatory gate (feature work)

When implementing or changing a service, controller, or other important domain logic:

1. Write or update colocated unit tests (`*.spec.ts`) for the changed service/controller.
2. Run `pnpm test` until green.
3. If e2e is relevant → follow the **e2e-testing** skill (decision table + prep/run + pitfalls); gate is in `.cursor/rules/e2e-testing.mdc`.
4. Only then mark the feature complete.

Do not claim a feature done without passing unit tests (and e2e when required).

## Quick Start

1. Decide **unit vs e2e** — for e2e required/not, use the **e2e-testing** skill decision table (canonical). Unit: service/controller logic with mocked port tokens.
2. Write the tests.
3. Verify (fastest first):
   - `pnpm test` (unit)
   - `pnpm run test:e2e:prep` then `pnpm run test:e2e` (when e2e-relevant)
   - `pnpm run build` / `pnpm run lint` if you touched configuration

## Unit Test Pattern (Mock Hexagonal Ports)

1. Create a Nest testing module with `@nestjs/testing`.
2. Provide the service under test (e.g. `AuthService`, `DiscoveryService`).
3. Provide **mock implementations for port tokens** only.
4. Do not import TypeORM/Mongoose models directly in unit tests.

Repo references:
- Auth service unit tests: `src/modules/auth/auth.service.spec.ts`
- Discovery service + controller unit tests: `src/modules/discovery/discovery.service.spec.ts`, `src/modules/discovery/discovery.controller.spec.ts`
- Port-token interfaces and tokens: `src/modules/*/ports/*`
- Typed factories for readable tests: `test/factories/auth-test-factories.ts`

## E2E

Do not duplicate e2e criteria or pitfalls here. Use the **e2e-testing** skill for prep/run, helpers, suite inventory, and failure triage. Live examples: `test/app.e2e-spec.ts`, `test/bookings-concurrency.e2e-spec.ts`.

## Failure Handling (Be Explicit)

If verification cannot run (missing Docker, failed migrations, connectivity):
- Do not silently skip the e2e work.
- Report which stage failed (`test:e2e:prep` vs `test:e2e`) and what is needed to fix it.
- For known local-stack symptoms, see e2e-testing skill pitfalls.

## Verification Checklist

When you finish adding/changing tests or feature code, ensure:
- `pnpm test` passes for unit tests
- `pnpm run test:e2e:prep` + `pnpm run test:e2e` pass when e2e was required or changed
- Lint/build remain clean if you touched configuration
