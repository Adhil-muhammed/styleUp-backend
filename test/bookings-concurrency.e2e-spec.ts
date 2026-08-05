/**
 * Concurrency test: double-booking prevention on booking_items.
 *
 * What this test proves:
 *   Two POST /bookings requests fired simultaneously for the same staff member
 *   and the same time slot must result in exactly one accepted booking (HTTP 402)
 *   and one rejection (HTTP 409 SLOT_ALREADY_BOOKED or DOUBLE_BOOKING).
 *
 * How the protection works (after V14 migration):
 *   The app-level isSlotTaken() check is a TOCTOU race — both concurrent requests
 *   can pass the SELECT check before either INSERT completes. The GIST EXCLUDE
 *   constraint excl_booking_items_staff_overlap (added in V14) catches the
 *   second INSERT and raises PostgreSQL error 23P01, which the repository layer
 *   maps to a 409 ConflictException.
 *
 * Before V14:
 *   Without the DB constraint the test will fail with "RACE CONDITION DETECTED"
 *   whenever both requests slip past the app-level check — demonstrating that
 *   the guard is insufficient on its own.
 *
 * Run: pnpm run test:e2e:prep && pnpm run test:e2e
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import { truncatePostgres } from './helpers/postgres-test-utils';
import { clearRedis } from './helpers/redis-test-utils';

// ---------------------------------------------------------------------------
// Fixed UUIDs for seeded fixture — never overlap with app-generated ids.
// ---------------------------------------------------------------------------
const SHOP_ID = 'aaaaaaaa-0001-4000-8000-000000000001';
const STAFF_ID = 'aaaaaaaa-0002-4000-8000-000000000002';
const CATEGORY_ID = 'aaaaaaaa-0003-4000-8000-000000000003';
const CATALOG_SERVICE_ID = 'aaaaaaaa-0004-4000-8000-000000000004';
const SHOP_SERVICE_ID = 'aaaaaaaa-0005-4000-8000-000000000005';
const PAYMENT_METHOD_ID = 'aaaaaaaa-0006-4000-8000-000000000006';

const CONCURRENCY_ITERATIONS = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `+91${suffix}`;
}

/** Returns the next calendar date string (YYYY-MM-DD) as seen in IST (UTC+5:30). */
function tomorrowIst(): string {
  const istOffsetMs = 330 * 60_000;
  const nowIst = new Date(Date.now() + istOffsetMs);
  const tomorrowIst = new Date(nowIst.getTime() + 24 * 60 * 60_000);
  return tomorrowIst.toISOString().slice(0, 10);
}

/**
 * Extracts the `sub` claim from a JWT access token without signature
 * verification — safe for test environment only.
 */
function extractSub(token: string): string {
  const [, b64] = token.split('.');
  const payload = JSON.parse(Buffer.from(b64!, 'base64url').toString('utf-8')) as Record<
    string,
    unknown
  >;
  return payload['sub'] as string;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Booking double-booking concurrency (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  const selectedDateYmd = tomorrowIst();
  const selectedTimeId = '1500'; // 3:00 PM IST

  // UTC equivalents for the DB query (IST = UTC+5:30).
  const slotStart = new Date(`${selectedDateYmd}T15:00:00+05:30`);
  const slotEnd = new Date(`${selectedDateYmd}T15:30:00+05:30`);

  jest.setTimeout(180_000);

  // ---------------------------------------------------------------------------
  // Setup: create app, seed fixture once for all iterations.
  // ---------------------------------------------------------------------------

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    await truncatePostgres(app);
    await clearRedis(app);

    // Create the customer account via the standard OTP flow so we get a valid
    // JWT and an auto-created customers row.
    const phone = uniquePhone();
    const otpRes = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({ contact: phone, method: 'sms' })
      .expect(200);
    const { otpSessionId } = otpRes.body.data as { otpSessionId: string };

    const verifyRes = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/verify')
      .send({
        otpSessionId,
        action: 'verify',
        otp: '123456',
        displayName: 'Concurrency E2E User',
        deviceId: 'device-concurrency-e2e',
      })
      .expect(200);
    accessToken = verifyRes.body.data.tokens.accessToken as string;
    const userId = extractSub(accessToken);

    // Seed shop — owner_id reuses the customer's user id (acceptable for fixture).
    await dataSource.query(
      `INSERT INTO shops
         (id, owner_id, name, email, phone, city, address, location, status, is_featured)
       VALUES
         ($1, $2, 'Concurrency Test Shop', 'e2e-concurrency@test.invalid',
          '+910000000099', 'Kochi', '1 Test Road',
          ST_SetSRID(ST_MakePoint(76.2673, 9.9312), 4326), 'approved', false)`,
      [SHOP_ID, userId],
    );

    // Seed staff — user_id reuses the customer's user id.
    await dataSource.query(
      `INSERT INTO staff (id, user_id, shop_id, name, job_title,
                          availability_status, workflow_status)
       VALUES ($1, $2, $3, 'Test Barber', 'Barber', 'available', 'active')`,
      [STAFF_ID, userId, SHOP_ID],
    );

    // Seed catalog hierarchy.
    await dataSource.query(
      `INSERT INTO service_categories (id, slug, name, status)
       VALUES ($1, 'e2e-concurrency-cat', 'E2E Concurrency', 'active')`,
      [CATEGORY_ID],
    );
    await dataSource.query(
      `INSERT INTO catalog_services
         (id, category_id, name, target_gender, is_active)
       VALUES ($1, $2, 'E2E Haircut', 'male', true)`,
      [CATALOG_SERVICE_ID, CATEGORY_ID],
    );
    await dataSource.query(
      `INSERT INTO shop_services
         (id, shop_id, catalog_service_id, price_paise, duration_minutes, is_active)
       VALUES ($1, $2, $3, 30000, 30, true)`,
      [SHOP_SERVICE_ID, SHOP_ID, CATALOG_SERVICE_ID],
    );

    // Seed payment method for the user.
    await dataSource.query(
      `INSERT INTO payment_methods (id, user_id, kind, label, is_default)
       VALUES ($1, $2, 'google_pay', 'Google Pay', true)`,
      [PAYMENT_METHOD_ID, userId],
    );

    // Seed shop operating hours: open 09:00–21:00 every day of the week so that
    // whatever day "tomorrow" falls on is covered.
    for (let dow = 1; dow <= 7; dow++) {
      const schedId = `aaaaaaaa-${String(dow).padStart(4, '0')}-4000-9000-000000000000`;
      await dataSource.query(
        `INSERT INTO schedules
           (id, shop_id, schedule_type, day_of_week, start_time, end_time, is_closed)
         VALUES ($1, $2, 'shop_operating_hours', $3, '09:00', '21:00', false)`,
        [schedId, SHOP_ID, dow],
      );
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ---------------------------------------------------------------------------
  // Main concurrency test
  // ---------------------------------------------------------------------------

  it(`prevents double-booking across ${CONCURRENCY_ITERATIONS} concurrent request pairs`, async () => {
    // Verify the DB constraint was applied (V14 migration must have run).
    // This assertion fails immediately if the migration has not been applied,
    // giving a clear message rather than a flaky race-condition failure.
    const [{ count: constraintCount }] = await dataSource.query<Array<{ count: string }>>(
      `SELECT COUNT(*) AS count
         FROM pg_constraint
         WHERE conname = 'excl_booking_items_staff_overlap'`,
    );
    expect(Number(constraintCount)).toBe(1);

    const bookingPayload = {
      shopId: SHOP_ID,
      selectedSpecialistId: STAFF_ID,
      selectedDateYmd,
      selectedTimeId,
      selectedVariants: { [CATEGORY_ID]: SHOP_SERVICE_ID },
      paymentMethodId: PAYMENT_METHOD_ID,
    };

    for (let i = 0; i < CONCURRENCY_ITERATIONS; i++) {
      // Reset only booking rows between iterations; fixture data is preserved.
      await dataSource.query(`TRUNCATE TABLE bookings RESTART IDENTITY CASCADE`);

      // Fire two identical booking requests simultaneously.
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/mobile/v1/bookings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(bookingPayload),
        request(app.getHttpServer())
          .post('/api/mobile/v1/bookings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(bookingPayload),
      ]);

      // Query the actual DB state.
      const [{ count: itemCount }] = await dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count
           FROM booking_items
           WHERE staff_id = $1
             AND scheduled_start < $2
             AND scheduled_end   > $3
             AND item_status NOT IN ('cancelled', 'no_show')`,
        [STAFF_ID, slotEnd, slotStart],
      );

      // If more than one row exists, the race slipped through — hard fail with
      // a message that explains the root cause and the fix.
      if (Number(itemCount) > 1) {
        throw new Error(
          `RACE CONDITION DETECTED on iteration ${i + 1}: ` +
            `${itemCount} overlapping booking_items rows exist for the same staff+slot. ` +
            `The app-level isSlotTaken() check (SELECT COUNT then INSERT) is a TOCTOU race — ` +
            `both concurrent requests can pass the SELECT before either INSERT completes. ` +
            `Fix: ensure V14 migration (excl_booking_items_staff_overlap) has been applied.`,
        );
      }

      // Exactly one booking item must exist.
      expect(Number(itemCount)).toBe(1);

      // HTTP statuses: 402 = booking created (payment pending), 409 = rejected.
      const statuses = [r1.status, r2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([402, 409]);

      // The 409 body must carry a recognised conflict code.
      const rejected = r1.status === 409 ? r1 : r2;
      const rejectedBody = rejected.body as { error?: { code?: string } };
      expect(['SLOT_ALREADY_BOOKED', 'DOUBLE_BOOKING']).toContain(rejectedBody.error?.code);
    }
  });
});
