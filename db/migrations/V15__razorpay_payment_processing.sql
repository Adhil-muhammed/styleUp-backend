-- V15: Razorpay UPI Intent — processing status, webhook idempotency, payment indexes.

-- 1. Extend transaction_status CHECK to include 'processing'.
ALTER TABLE payments DROP CONSTRAINT chk_payments_transaction_status;
ALTER TABLE payments ADD CONSTRAINT chk_payments_transaction_status
  CHECK (transaction_status IN (
    'pending', 'processing', 'success', 'failed', 'refunded', 'partially_refunded'
  ));

-- 2. One Razorpay order id must not map to multiple payment rows.
CREATE UNIQUE INDEX idx_payments_gateway_order
  ON payments (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

-- 3. At most one in-flight payment attempt per booking.
CREATE UNIQUE INDEX idx_payments_active_booking
  ON payments (booking_id)
  WHERE transaction_status IN ('pending', 'processing');

-- 4. Webhook event deduplication (Razorpay x-razorpay-event-id).
CREATE TABLE payment_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_event_id    varchar(128) NOT NULL,
  event_type          varchar(64)  NOT NULL,
  gateway_payment_id  varchar(128),
  gateway_order_id    varchar(128),
  payload             jsonb        NOT NULL,
  processed_at        timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_webhook_events_gateway_event_id UNIQUE (gateway_event_id)
);

CREATE INDEX idx_payment_webhook_events_order
  ON payment_webhook_events (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
