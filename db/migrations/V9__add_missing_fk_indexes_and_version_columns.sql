-- V9: Add optimistic-locking version columns to bookings and payments.
--
-- Context: V4–V8 include all FK indexes inline with their table definitions.
-- This migration adds the `version` column (for optimistic locking) to the two
-- tables that have concurrent-write risk: bookings and payments.
-- postgres-schema.mdc section B requires this unconditionally.

ALTER TABLE bookings ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN version integer NOT NULL DEFAULT 1;
