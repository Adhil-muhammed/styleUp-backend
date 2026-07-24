# F. Security & access

**Why:** Least privilege and tenant isolation are DB concerns on Supabase.

## RLS (when enabled)

Policies scoped by `shop_id` and/or `auth.uid()`. Do not leave tables exposed with RLS on and no policy.

## PII

Flag phone numbers, names, payment identifiers for encryption-at-rest or column-level masking. Do not log raw PII.

## Roles / grants

App role: DML only in prod — **no DDL**. Migrations run as a privileged migrator role, not the runtime role.
