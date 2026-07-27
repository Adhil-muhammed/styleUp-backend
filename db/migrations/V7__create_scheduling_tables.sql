-- V7: Scheduling tables: schedules (with EXCLUDE overlap constraint) and
--     schedule_exceptions (with two EXCLUDE constraints for shop and staff scope).
-- Requires: V3 extensions (postgis, btree_gist, timerange type).

CREATE TABLE schedules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        uuid NOT NULL,
  staff_id       uuid,
  schedule_type  varchar(32) NOT NULL,
  day_of_week    smallint NOT NULL,
  start_time     time,
  end_time       time,
  is_closed      boolean NOT NULL DEFAULT FALSE,
  label          varchar(64),
  effective_from date,
  effective_to   date,
  CONSTRAINT fk_schedules_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT fk_schedules_staff
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE,
  -- ISO day numbering: 1 = Monday, 7 = Sunday.
  CONSTRAINT chk_schedules_day_of_week
    CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_schedules_type
    CHECK (schedule_type IN ('shop_operating_hours', 'staff_recurring_pattern', 'staff_break')),
  -- Shop hours have no staff; staff patterns/breaks require one.
  CONSTRAINT chk_schedules_staff_scope CHECK (
    (schedule_type = 'shop_operating_hours' AND staff_id IS NULL)
    OR (schedule_type IN ('staff_recurring_pattern', 'staff_break') AND staff_id IS NOT NULL)
  ),
  -- Open days need a valid non-empty window; closed days must have NULL times.
  CONSTRAINT chk_schedules_time_window CHECK (
    (is_closed = FALSE AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    OR (is_closed = TRUE AND start_time IS NULL AND end_time IS NULL)
  )
);

CREATE INDEX idx_schedules_tenant_day
  ON schedules (shop_id, staff_id, day_of_week);

-- Prevents two open windows from overlapping for the same shop + staff + weekday
-- across both effective date range and time range.
-- timerange is the custom range type from V3; uuid/smallint equality in GiST uses btree_gist.
ALTER TABLE schedules
  ADD CONSTRAINT ex_schedules_no_overlap
  EXCLUDE USING gist (
    shop_id WITH =,
    staff_id WITH =,
    day_of_week WITH =,
    (tsrange(effective_from::timestamp, effective_to::timestamp)) WITH &&,
    (timerange(start_time, end_time)) WITH &&
  )
  WHERE (is_closed = FALSE);

CREATE TABLE schedule_exceptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid NOT NULL,
  staff_id        uuid,
  scope           varchar(16) NOT NULL,
  exception_type  varchar(32) NOT NULL,
  start_timestamp timestamptz NOT NULL,
  end_timestamp   timestamptz NOT NULL,
  reason          varchar(255),
  workflow_status varchar(32) NOT NULL DEFAULT 'approved',
  CONSTRAINT fk_schedule_exceptions_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_exceptions_staff
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE CASCADE,
  CONSTRAINT chk_schedule_exceptions_scope
    CHECK (scope IN ('shop', 'staff')),
  CONSTRAINT chk_schedule_exceptions_type
    CHECK (exception_type IN ('holiday', 'leave', 'blocked_slot')),
  CONSTRAINT chk_schedule_exceptions_workflow_status
    CHECK (workflow_status IN ('pending', 'approved', 'rejected')),
  -- Shop-scope exceptions carry no staff; staff-scope requires one.
  CONSTRAINT chk_schedule_exceptions_staff_scope CHECK (
    (scope = 'shop' AND staff_id IS NULL)
    OR (scope = 'staff' AND staff_id IS NOT NULL)
  ),
  CONSTRAINT chk_schedule_exceptions_time_window
    CHECK (end_timestamp > start_timestamp)
);

CREATE INDEX idx_exceptions_tenant_time
  ON schedule_exceptions (shop_id, staff_id, start_timestamp, end_timestamp);

-- DEVIATION: using tstzrange (not tsrange) because start_timestamp/end_timestamp are
-- timestamptz. Casting timestamptz → timestamp inside a GiST EXCLUDE is STABLE
-- (timezone-dependent), which Postgres rejects. tstzrange is immutable and correct.

-- EXCLUDE for shop-wide exceptions: no two live (approved/pending) shop exceptions overlap.
ALTER TABLE schedule_exceptions
  ADD CONSTRAINT ex_schedule_exceptions_shop_scope
  EXCLUDE USING gist (
    shop_id WITH =,
    (tstzrange(start_timestamp, end_timestamp)) WITH &&
  )
  WHERE (scope = 'shop' AND workflow_status IN ('approved', 'pending'));

-- EXCLUDE for staff exceptions: same rule per staff member within a shop.
ALTER TABLE schedule_exceptions
  ADD CONSTRAINT ex_schedule_exceptions_staff_scope
  EXCLUDE USING gist (
    shop_id WITH =,
    staff_id WITH =,
    (tstzrange(start_timestamp, end_timestamp)) WITH &&
  )
  WHERE (scope = 'staff' AND workflow_status IN ('approved', 'pending'));
