-- V16: Booking reminder prefs, cancellation timestamp, customer address.

ALTER TABLE bookings
  ADD COLUMN reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN reminder_option_id varchar(16),
  ADD COLUMN cancelled_at timestamptz;

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_reminder_option_id
  CHECK (
    reminder_option_id IS NULL
    OR reminder_option_id IN ('30_min', '1_hour', '2_hour', '1_day')
  );

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_reminder_option_when_enabled
  CHECK (
    (reminder_enabled = false AND reminder_option_id IS NULL)
    OR (reminder_enabled = true AND reminder_option_id IS NOT NULL)
  );

CREATE INDEX idx_bookings_active_reminders
  ON bookings (scheduled_start)
  WHERE reminder_enabled = true AND cancelled_at IS NULL;

ALTER TABLE customers
  ADD COLUMN address text;
