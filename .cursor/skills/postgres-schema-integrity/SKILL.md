---
name: postgres-schema-integrity
description: >-
  Reviews and authors PostgreSQL schemas for StyleUp NestJS + TypeORM hexagonal
  backends (Supabase). Enforces DB-level integrity, EXCLUDE scheduling constraints,
  indexing, migration safety, RLS/least-privilege, and naming. Use when creating or
  changing TypeORM entities, migrations, CHECK/EXCLUDE constraints, booking
  availability overlaps, money columns, or reviewing Postgres schema PRs.
---

# PostgreSQL Schema Integrity (StyleUp)

Skill teaches. The rule [`.cursor/rules/postgres-schema.mdc`](../../rules/postgres-schema.mdc) enforces a section-level checklist; open the linked reference for row-level detail and examples.

For Postgres **performance** depth, see [supabase-postgres-best-practices](../supabase-postgres-best-practices/SKILL.md). For adapter/layer placement, see [hexagonal-architecture.mdc](../../rules/hexagonal-architecture.mdc). Mongo geo/soft-delete: [data-schemas.mdc](../../rules/data-schemas.mdc) — parallel, not overlapping. For Flyway naming, versioning, and two-step destructive changes, see [flyway-migrations skill](../../../.claude/skills/flyway-migrations/SKILL.md).

## Project defaults

- Money: `*_paise` as `integer` — never `numeric` / `float` / `double precision`
- Tenant key: `shop_id` on multi-tenant tables; consistent per aggregate; flag tenant-scoped tables missing it
- ORM: TypeORM — `CHECK` / `EXCLUDE` require **raw SQL in migrations**; decorators alone are insufficient
- Hexagonal: schema/constraint SQL in `db/migrations/` (Flyway SQL files) + entity mapping in `src/infra/persistence/postgres/` — **never** domain layer
- Pagination: cursor-based — composite indexes must include the cursor sort column, in sort order
- DB: PostgreSQL via Supabase

## Review workflow

1. Walk sections **A → H** in order (open each A–G reference as needed).
2. Classify each finding with the **Layer Decision Rule (H)**.
3. Emit output:
   - **Review/fix of an existing table:** full fix-output format (below).
   - **Net-new schema authoring:** A–H checklist + layer justification only — **skip** the table-diff format.

**External specs are a floor, not a ceiling.** When implementing from a source document (PRD, schema doc, etc.) under an explicit "implement literally, nothing beyond it" instruction, the spec's silence on indexing (C) or concurrency (B) is not an exemption from those sections — it's a scope decision to defer them. State that explicitly, then ship the gap as a named follow-up migration once confirmed, rather than silently skipping A–H.

### Fix-output format (review/fix only)

```
Line 1: what changed.
Line 2: which layer + why.

Then updated table structure in the original format,
with // FIX: inline comments only on changed lines.
```

**Example (review/fix):**

```
Added ON DELETE RESTRICT on bookings.customer_id and a status CHECK.
DB layer — corrupt orphan bookings and invalid statuses must be impossible.

CREATE TABLE bookings (
  id           uuid PRIMARY KEY,
  customer_id  uuid NOT NULL
    REFERENCES customers(id) ON DELETE RESTRICT,  // FIX: was implicit / missing
  status       varchar(32) NOT NULL
    CONSTRAINT chk_bookings_status
      CHECK (status IN ('pending','confirmed','cancelled','completed')),  // FIX
  ...
);
```

## Sections A–G (detail in references)

- **A. Data integrity** — explicit `ON DELETE`, XOR CHECKs, `_paise`, `timestamptz`, status CHECKs. See [a-data-integrity.md](references/a-data-integrity.md).
- **B. Concurrency** — EXCLUDE + partial, `version`, documented `FOR UPDATE` order. See [b-concurrency.md](references/b-concurrency.md).
- **C. Indexing** — every FK, cursor sort order, partials; flag N+1 / covering gaps. See [c-indexing.md](references/c-indexing.md).
- **D. Design** — no silent cascades; derived cols trigger/generated; JSONB justified; `shop_id` indexed. See [d-normalization.md](references/d-normalization.md).
- **E. Migrations** — expand/backfill/constrain; `CONCURRENTLY`; idempotent; partition candidates. See [e-migrations.md](references/e-migrations.md).
- **F. Security** — RLS by `shop_id`/uid if on; PII flagged; app role no DDL. See [f-security.md](references/f-security.md).
- **G. Naming** — `idx_`/`fk_`/`chk_`/`uq_`/`ex_`; snake_case; singular FKs. See [g-naming.md](references/g-naming.md).

## H. Layer Decision Rule

Apply to **every** finding:

1. Impossible/corrupt state possible → **DB** (constraint / trigger / exclude).
2. Business rule that changes often or needs external calls/context → **Application**.
3. Both correctness and UX matter → enforce at **DB**, validate early at **app** for clean error messages.

Schema fixes stay in adapters + migrations — domain layer stays free of TypeORM/SQL.

## Net-new authoring (no table-diff)

When creating a new entity/migration, walk A–H and state briefly:

- Which constraints/indexes you added and why (layer).
- That CHECK/EXCLUDE live in the migration SQL.
- Cursor index column order if the table is listed via cursor pagination.

Do **not** invent a before/after table dump.
