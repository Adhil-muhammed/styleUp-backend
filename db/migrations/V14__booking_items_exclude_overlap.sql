-- V14: Add a GiST EXCLUDE constraint on booking_items to prevent overlapping
--      bookings for the same staff member at the database level.
--
--      The prior protection was app-level only (isSlotTaken SELECT + INSERT)
--      which is a TOCTOU race: two concurrent requests can both pass the SELECT
--      check before either has inserted, resulting in two overlapping rows.
--
--      btree_gist is already enabled in V3, so no extension install is needed.
--      The partial WHERE clause mirrors idx_booking_items_staff_schedule so that
--      cancelled/no-show rows are excluded from the exclusion window.

ALTER TABLE booking_items
  ADD CONSTRAINT excl_booking_items_staff_overlap
  EXCLUDE USING gist (
    staff_id                                  WITH =,
    tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
  )
  WHERE (item_status NOT IN ('cancelled', 'no_show'));
