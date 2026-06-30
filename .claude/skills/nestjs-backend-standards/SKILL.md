---
name: nestjs-backend-standards
description: >-
  Applies StyleUp NestJS backend standards for hexagonal architecture, mobile
  API contracts, auth, payments, and MongoDB schemas. Use when adding a new
  module, creating an endpoint, adding an API route, writing a DTO, scaffolding
  a Mongoose schema, adding a guard, interceptor, or any backend feature work
  in the StyleUp backend (NestJS + MongoDB + Redis + Razorpay, React Native client).
---

# StyleUp NestJS Backend Standards

Apply these conventions on every backend feature task. Stack: NestJS 10, MongoDB/Mongoose, Redis, JWT, Razorpay — serving a React Native/Expo mobile app (Kerala, India).

## Architecture

- Hexagonal/ports-adapters: **Controller → Service → Repository**
- One module per domain (`auth`, `users`, `providers`, `bookings`, `payments`, `notifications`)
- No cross-module direct DB access — call the other module's exported service
- REST only — no gRPC
- DTOs required on every request/response; `class-validator` on all input DTOs
- Never expose Mongoose documents from controllers — map to response DTOs
- TypeScript strict mode — no `any`

## Mobile API Contract

- Standard envelope: `{ success, data, error?: { code, message } }` — never return raw objects/arrays at top level
- Pagination required on all list endpoints — cursor-based preferred; never unbounded arrays
- Error codes are stable enum-like strings (e.g. `BOOKING_SLOT_TAKEN`) — mobile switches on `code`, not message text
- All timestamps ISO 8601 UTC (`2025-01-15T10:30:00.000Z`)
- **GeoJSON coordinates: `[longitude, latitude]` — NOT `[lat, lng]`** (common mistake, causes silent geo failures)
- Sync-heavy endpoints (bookings, provider availability): support `updatedAfter` query param or ETags/`If-Modified-Since`
- File uploads via signed URLs — no raw multipart into NestJS except small avatars
- Push notification payloads: typed interface per notification type, no ad-hoc string templates

See [references/response-dto-example.ts](references/response-dto-example.ts) for envelope + paginated list DTO pattern.

## Auth

- OTP-based login only — no passwords
- JWT access (15 min) + refresh (7 days) pair; refresh rotation on use; `jti` claim (UUID v4) on every token
- Redis blocklist keyed by `jti`, TTL = remaining token lifetime
- Guards composed via `@UseGuards(AuthGuard, RolesGuard)` + `@Roles()` — never manual JWT/role checks in controllers
- Rate-limit OTP request endpoints per phone number via Redis

## Payments (Razorpay)

- **UPI Intent only** — UPI Collect deprecated Feb 2026; do not scaffold or reference it
- Mandatory webhook signature verification before any processing
- Explicit payment state machine: `pending → processing → success | failed`
- Never mutate booking status directly from a webhook — go through the state machine
- All amounts stored as integer paise — never floats
- Do not touch payment state machine logic without explicit sign-off

## Data & Schemas

- Any geo-queried collection MUST have a `2dsphere` index — flag if geo query added without one
- Design compound indexes from query patterns before writing schema
- Soft deletes (`deletedAt`) for bookings, users, and payment-linked records — never hard delete
- Enforce soft-delete filter via Mongoose middleware/plugin, not call-site filtering

## New Module Scaffolding

Every new module ships with ALL of:

- `*.module.ts`, `*.controller.ts`, `*.service.ts`
- `dto/` subfolder (request + response DTOs)
- `*.schema.ts` (if DB-backed)
- Barrel `index.ts` exporting the module class

## End-of-Task Verification

End every task with an explicit checklist tailored to what was built:

- [ ] `pnpm run build` — zero TypeScript errors
- [ ] `pnpm run lint` — clean
- [ ] Relevant endpoint manually verified (if applicable)
- [ ] Response envelope applied (if endpoint added)
- [ ] Pagination on list endpoints (if list added)
- [ ] GeoJSON `[lng, lat]` order (if geo field added)
- [ ] `2dsphere` index (if geo query added)
- [ ] Soft-delete filter (if schema changed)
- [ ] No unintended scope creep; no new npm packages without flagging

## Deeper Reference

For full code examples and extended rules, see `.cursor/rules/`:

- `architecture.mdc`, `api-conventions.mdc`, `auth.mdc`, `payments.mdc`, `data-schemas.mdc`, `project-context.mdc`
