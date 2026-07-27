-- V8: Transaction tables: bookings, booking_items, booking_timeline,
--     payments, refunds, settlements, reviews.

CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid NOT NULL,
  customer_id       uuid NOT NULL,
  booking_status    varchar(32) NOT NULL,
  payment_status    varchar(32) NOT NULL,
  scheduled_start   timestamptz NOT NULL,
  scheduled_end     timestamptz NOT NULL,
  total_price_paise bigint NOT NULL,
  customer_notes    text,
  internal_notes    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_bookings_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE RESTRICT,
  -- customer_id references customers(user_id), not users(id).
  CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES customers (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_bookings_booking_status
    CHECK (booking_status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT chk_bookings_payment_status
    CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'failed', 'refunded')),
  CONSTRAINT chk_bookings_total_price_paise CHECK (total_price_paise >= 0),
  CONSTRAINT chk_bookings_schedule_window CHECK (scheduled_end > scheduled_start)
);

-- Dashboard query: shop dashboard orders by shop_id + status + start time.
CREATE INDEX idx_bookings_dashboard
  ON bookings (shop_id, booking_status, scheduled_start);

-- Customer view: customer's bookings ordered by start time.
CREATE INDEX idx_bookings_customer_view
  ON bookings (customer_id, scheduled_start);

CREATE TABLE booking_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid NOT NULL,
  staff_id         uuid NOT NULL,
  shop_service_id  uuid,
  package_id       uuid,
  scheduled_start  timestamptz NOT NULL,
  scheduled_end    timestamptz NOT NULL,
  duration_minutes int NOT NULL,
  unit_price_paise bigint NOT NULL,
  item_status      varchar(32) NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_booking_items_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_items_staff
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_items_shop_service
    FOREIGN KEY (shop_service_id) REFERENCES shop_services (id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_items_package
    FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE RESTRICT,
  CONSTRAINT chk_booking_items_duration_minutes CHECK (duration_minutes > 0),
  CONSTRAINT chk_booking_items_unit_price_paise CHECK (unit_price_paise >= 0),
  CONSTRAINT chk_booking_items_status
    CHECK (item_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  -- Exactly one of shop_service_id / package_id must be set.
  CONSTRAINT chk_booking_items_service_xor_package CHECK (
    (shop_service_id IS NOT NULL AND package_id IS NULL)
    OR (shop_service_id IS NULL AND package_id IS NOT NULL)
  )
);

CREATE INDEX idx_booking_items_parent
  ON booking_items (booking_id);

-- Staff schedule lookup skips cancelled/no-show lines.
CREATE INDEX idx_booking_items_staff_schedule
  ON booking_items (staff_id, scheduled_start, scheduled_end)
  WHERE item_status NOT IN ('cancelled', 'no_show');

CREATE INDEX idx_booking_items_shop_service
  ON booking_items (shop_service_id);

CREATE INDEX idx_booking_items_package
  ON booking_items (package_id);

CREATE TABLE booking_timeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL,
  booking_item_id uuid,
  event_type      varchar(32) NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  note            varchar(255),
  CONSTRAINT fk_booking_timeline_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_timeline_booking_item
    FOREIGN KEY (booking_item_id) REFERENCES booking_items (id) ON DELETE CASCADE,
  CONSTRAINT chk_booking_timeline_event_type CHECK (
    event_type IN ('created', 'confirmed', 'rescheduled', 'item_cancelled', 'completed', 'cancelled', 'no_show')
  )
);

CREATE INDEX idx_booking_timeline_booking
  ON booking_timeline (booking_id);

-- Partial index: only rows with a booking_item_id need this lookup.
CREATE INDEX idx_timeline_item_lookup
  ON booking_timeline (booking_item_id)
  WHERE booking_item_id IS NOT NULL;

CREATE TABLE payments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             uuid NOT NULL,
  gateway                varchar(32) NOT NULL,
  gateway_transaction_id varchar(128),
  gateway_order_id       varchar(128),
  payment_method         varchar(32) NOT NULL,
  amount_paise           bigint NOT NULL,
  refunded_amount_paise  bigint NOT NULL DEFAULT 0,
  transaction_status     varchar(32) NOT NULL,
  raw_response           jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT chk_payments_transaction_status CHECK (
    transaction_status IN ('pending', 'success', 'failed', 'refunded', 'partially_refunded')
  ),
  CONSTRAINT chk_payments_payment_method
    CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet')),
  -- Rejects zero-amount and double-negative refund bugs.
  CONSTRAINT chk_payments_amount_paise CHECK (amount_paise > 0),
  -- Refund total can never exceed the original payment amount.
  CONSTRAINT chk_payments_refund_bounds CHECK (
    refunded_amount_paise >= 0 AND amount_paise >= refunded_amount_paise
  )
);

CREATE INDEX idx_payments_booking
  ON payments (booking_id);

CREATE UNIQUE INDEX idx_payments_gateway_tx
  ON payments (gateway_transaction_id);

-- no updated_at on refunds — the spec uses requested_at / completed_at instead.
CREATE TABLE refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      uuid NOT NULL,
  booking_item_id uuid,
  amount_paise    bigint NOT NULL,
  reason          varchar(64) NOT NULL,
  status          varchar(32) NOT NULL,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  CONSTRAINT fk_refunds_payment
    FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE RESTRICT,
  -- Ties a partial refund to one service in a multi-service order.
  CONSTRAINT fk_refunds_booking_item
    FOREIGN KEY (booking_item_id) REFERENCES booking_items (id) ON DELETE RESTRICT,
  CONSTRAINT chk_refunds_status
    CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  CONSTRAINT chk_refunds_amount_paise CHECK (amount_paise > 0)
);

CREATE INDEX idx_refunds_payment
  ON refunds (payment_id);

CREATE INDEX idx_refunds_booking_item
  ON refunds (booking_item_id);

CREATE TABLE settlements (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                   uuid NOT NULL,
  period_start              timestamptz NOT NULL,
  period_end                timestamptz NOT NULL,
  gross_revenue_paise       bigint NOT NULL,
  platform_commission_paise bigint NOT NULL,
  net_payable_paise         bigint NOT NULL,
  status                    varchar(32) NOT NULL,
  processed_at              timestamptz,
  CONSTRAINT fk_settlements_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE RESTRICT,
  CONSTRAINT chk_settlements_status
    CHECK (status IN ('pending', 'processing', 'paid')),
  -- DB-enforced arithmetic integrity: gross - commission = net.
  CONSTRAINT chk_settlements_net_payable CHECK (
    gross_revenue_paise - platform_commission_paise = net_payable_paise
  )
);

CREATE INDEX idx_settlements_lookup
  ON settlements (shop_id, status);

-- One review per booking.
CREATE TABLE reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  rating     int NOT NULL,
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX idx_reviews_booking
  ON reviews (booking_id);
