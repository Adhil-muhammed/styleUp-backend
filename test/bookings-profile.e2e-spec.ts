/**
 * E2E: My Bookings list, reminder, cancel + Profile endpoints.
 *
 * Run: pnpm run test:e2e:prep && pnpm run test:e2e -- test/bookings-profile.e2e-spec.ts
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import { truncatePostgres } from './helpers/postgres-test-utils';
import { clearRedis } from './helpers/redis-test-utils';

const SHOP_ID = 'cccccccc-0001-4000-8000-000000000001';
const STAFF_ID = 'cccccccc-0002-4000-8000-000000000002';
const CATEGORY_ID = 'cccccccc-0003-4000-8000-000000000003';
const CATALOG_SERVICE_ID = 'cccccccc-0004-4000-8000-000000000004';
const SHOP_SERVICE_ID = 'cccccccc-0005-4000-8000-000000000005';
const BOOKING_ID = 'cccccccc-0007-4000-8000-000000000007';

function uniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `+91${suffix}`;
}

function futureIst(daysAhead: number): string {
  const istOffsetMs = 330 * 60_000;
  const nowIst = new Date(Date.now() + istOffsetMs);
  const target = new Date(nowIst.getTime() + daysAhead * 24 * 60 * 60_000);
  return target.toISOString().slice(0, 10);
}

describe('Bookings list + profile (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  jest.setTimeout(180_000);

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    await truncatePostgres(app);
    await clearRedis(app);

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
        displayName: 'Bookings E2E User',
        deviceId: 'device-bookings-e2e',
      })
      .expect(200);

    accessToken = verifyRes.body.data.tokens.accessToken as string;
    const [, b64] = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(b64!, 'base64url').toString('utf-8')) as Record<
      string,
      unknown
    >;
    userId = payload['sub'] as string;

    await dataSource.query(
      `INSERT INTO shops
         (id, owner_id, name, email, phone, city, address, location, status, is_featured, cover_image_url)
       VALUES
         ($1, $2, 'List Test Salon', 'e2e-list@test.invalid', '+910000000099', 'Kochi',
          '12 Marine Drive', ST_SetSRID(ST_MakePoint(76.2673, 9.9312), 4326), 'approved', false,
          'https://cdn.test/shops/cover.jpg')`,
      [SHOP_ID, userId],
    );

    await dataSource.query(
      `INSERT INTO staff (id, user_id, shop_id, name, job_title, availability_status, workflow_status)
       VALUES ($1, $2, $3, 'List Test Barber', 'Barber', 'available', 'active')`,
      [STAFF_ID, userId, SHOP_ID],
    );

    await dataSource.query(
      `INSERT INTO service_categories (id, slug, name, status)
       VALUES ($1, 'hair-list-e2e', 'Hair', 'active')`,
      [CATEGORY_ID],
    );

    await dataSource.query(
      `INSERT INTO catalog_services (id, category_id, name, target_gender, is_active)
       VALUES ($1, $2, 'Classic Cut', 'male', true)`,
      [CATALOG_SERVICE_ID, CATEGORY_ID],
    );

    await dataSource.query(
      `INSERT INTO shop_services (id, shop_id, catalog_service_id, price_paise, duration_minutes, is_active)
       VALUES ($1, $2, $3, 30000, 30, true)`,
      [SHOP_SERVICE_ID, SHOP_ID, CATALOG_SERVICE_ID],
    );

    const scheduledStart = `${futureIst(2)}T10:00:00+05:30`;
    const scheduledEnd = `${futureIst(2)}T10:30:00+05:30`;

    await dataSource.query(
      `INSERT INTO bookings
         (id, shop_id, customer_id, booking_status, payment_status,
          scheduled_start, scheduled_end, total_price_paise)
       VALUES
         ($1, $2, $3, 'confirmed', 'paid', $4::timestamptz, $5::timestamptz, 30000)`,
      [BOOKING_ID, SHOP_ID, userId, scheduledStart, scheduledEnd],
    );

    await dataSource.query(
      `INSERT INTO booking_items
         (id, booking_id, staff_id, shop_service_id, scheduled_start, scheduled_end,
          duration_minutes, unit_price_paise, item_status)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4::timestamptz, $5::timestamptz, 30, 30000, 'confirmed')`,
      [BOOKING_ID, STAFF_ID, SHOP_SERVICE_ID, scheduledStart, scheduledEnd],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users/me returns extended profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/mobile/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.id).toBe(userId);
    expect(res.body.data.profile.displayName).toBe('Bookings E2E User');
    expect(res.body.data.profile).toHaveProperty('xpPoints');
    expect(res.body.data.profile).toHaveProperty('level');
  });

  it('PATCH /users/me updates display name', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/mobile/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Updated E2E Name', nickname: 'e2e' })
      .expect(200);

    expect(res.body.data.profile.displayName).toBe('Updated E2E Name');
    expect(res.body.data.profile.nickname).toBe('e2e');
  });

  it('POST /users/me/avatar returns signed upload URLs', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/mobile/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(res.body.data.avatarUrl).toMatch(/^https:\/\//);
    expect(res.body.data.uploadUrl).toMatch(/^https:\/\//);
  });

  it('GET /bookings?status=upcoming lists customer booking', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/mobile/v1/bookings')
      .query({ status: 'upcoming', page: 1, perPage: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].id).toBe(BOOKING_ID);
    expect(res.body.data.data[0].shopName).toBe('List Test Salon');
    expect(res.body.data.data[0].services).toContain('Classic Cut');
    expect(res.body.data.meta.total).toBe(1);
  });

  it('PATCH /bookings/:id/reminder enables reminder', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/mobile/v1/bookings/${BOOKING_ID}/reminder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reminderEnabled: true, reminderOptionId: '1_hour' })
      .expect(200);

    expect(res.body.data.reminderEnabled).toBe(true);
    expect(res.body.data.reminderLabel).toBe('1 hour before');
  });

  it('DELETE /bookings/:id cancels upcoming booking', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/mobile/v1/bookings/${BOOKING_ID}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancelledAt).toBeTruthy();
  });

  it('GET /bookings?status=past includes cancelled booking', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/mobile/v1/bookings')
      .query({ status: 'past' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.data.some((b: { id: string }) => b.id === BOOKING_ID)).toBe(true);
  });

  it('POST /bookings/:id/reschedule returns 501', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/mobile/v1/bookings/${BOOKING_ID}/reschedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ selectedDateYmd: futureIst(5), selectedTimeId: '1100' })
      .expect(501);

    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });
});
