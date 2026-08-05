-- V13: Add 'in_progress' to bookings.booking_status CHECK constraint;
--      add paid_at to payments; create payment_methods table.

-- 1. Extend booking_status to include 'in_progress' for the barber-at-work state.
--    PostgreSQL requires drop + re-add to change a CHECK constraint.
ALTER TABLE bookings DROP CONSTRAINT chk_bookings_booking_status;
ALTER TABLE bookings ADD CONSTRAINT chk_bookings_booking_status
  CHECK (booking_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

-- 2. Track the exact moment a payment was confirmed by the gateway.
--    Nullable because the row is written before confirmation (status=pending).
ALTER TABLE payments ADD COLUMN paid_at timestamptz;

-- 3. Client-side saved payment methods (wallet / card list for the BookAppointment screen).
--    Intentionally separate from payments.payment_method (gateway settlement method).
CREATE TABLE payment_methods (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  kind       varchar(32) NOT NULL,
  label      varchar(128) NOT NULL,
  last_four  varchar(4),
  is_default boolean     NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_payment_methods_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_payment_methods_kind
    CHECK (kind IN ('paypal', 'google_pay', 'apple_pay', 'saved_card'))
);

-- Quick lookup of all methods for a user.
CREATE INDEX idx_payment_methods_user
  ON payment_methods (user_id);

-- Enforce at most one default method per user at the DB level.
CREATE UNIQUE INDEX idx_payment_methods_default
  ON payment_methods (user_id)
  WHERE is_default = TRUE;
