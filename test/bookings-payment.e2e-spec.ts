/**
 * E2E: booking pay flow with Razorpay UPI Intent (mock gateway) + webhook confirmation.
 *
 * Run: pnpm run test:e2e:prep && pnpm run test:e2e -- test/bookings-payment.e2e-spec.ts
 */
import { INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/create-test-app';
import { truncatePostgres } from './helpers/postgres-test-utils';
import { clearRedis } from './helpers/redis-test-utils';

const WEBHOOK_SECRET = 'e2e_test_webhook_secret';

const SHOP_ID = 'bbbbbbbb-0001-4000-8000-000000000001';
const STAFF_ID = 'bbbbbbbb-0002-4000-8000-000000000002';
const CATEGORY_ID = 'bbbbbbbb-0003-4000-8000-000000000003';
const CATALOG_SERVICE_ID = 'bbbbbbbb-0004-4000-8000-000000000004';
const SHOP_SERVICE_ID = 'bbbbbbbb-0005-4000-8000-000000000005';
const PAYMENT_METHOD_ID = 'bbbbbbbb-0006-4000-8000-000000000006';

function uniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `+91${suffix}`;
}

function tomorrowIst(): string {
  const istOffsetMs = 330 * 60_000;
  const nowIst = new Date(Date.now() + istOffsetMs);
  const tomorrowIst = new Date(nowIst.getTime() + 24 * 60 * 60_000);
  return tomorrowIst.toISOString().slice(0, 10);
}

function extractSub(token: string): string {
  const [, b64] = token.split('.');
  const payload = JSON.parse(Buffer.from(b64!, 'base64url').toString('utf-8')) as Record<
    string,
    unknown
  >;
  return payload['sub'] as string;
}

function signWebhookBody(body: Buffer): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

describe('Booking payment flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;

  const selectedDateYmd = tomorrowIst();
  const selectedTimeId = '1600';

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
        displayName: 'Payment E2E User',
        deviceId: 'device-payment-e2e',
      })
      .expect(200);

    accessToken = verifyRes.body.data.tokens.accessToken as string;
    const userId = extractSub(accessToken);

    await dataSource.query(
      `INSERT INTO shops
         (id, owner_id, name, email, phone, city, address, location, status, is_featured)
       VALUES
         ($1, $2, 'Payment Test Shop', 'e2e-payment@test.invalid',
          '+910000000088', 'Kochi', '2 Test Road',
          ST_SetSRID(ST_MakePoint(76.2673, 9.9312), 4326), 'approved', false)`,
      [SHOP_ID, userId],
    );

    await dataSource.query(
      `INSERT INTO staff (id, user_id, shop_id, name, job_title,
                          availability_status, workflow_status)
       VALUES ($1, $2, $3, 'Pay Test Barber', 'Barber', 'available', 'active')`,
      [STAFF_ID, userId, SHOP_ID],
    );

    await dataSource.query(
      `INSERT INTO service_categories (id, slug, name, status)
       VALUES ($1, 'e2e-payment-cat', 'E2E Payment', 'active')`,
      [CATEGORY_ID],
    );
    await dataSource.query(
      `INSERT INTO catalog_services
         (id, category_id, name, target_gender, is_active)
       VALUES ($1, $2, 'E2E Pay Haircut', 'male', true)`,
      [CATALOG_SERVICE_ID, CATEGORY_ID],
    );
    await dataSource.query(
      `INSERT INTO shop_services
         (id, shop_id, catalog_service_id, price_paise, duration_minutes, is_active)
       VALUES ($1, $2, $3, 30000, 30, true)`,
      [SHOP_SERVICE_ID, SHOP_ID, CATALOG_SERVICE_ID],
    );
    await dataSource.query(
      `INSERT INTO payment_methods (id, user_id, kind, label, is_default)
       VALUES ($1, $2, 'google_pay', 'Google Pay', true)`,
      [PAYMENT_METHOD_ID, userId],
    );

    for (let dow = 1; dow <= 7; dow++) {
      const schedId = `bbbbbbbb-${String(dow).padStart(4, '0')}-4000-9000-000000000000`;
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

  it('create → pay intent → webhook captured → confirmed booking', async () => {
    const bookingPayload = {
      shopId: SHOP_ID,
      selectedSpecialistId: STAFF_ID,
      selectedDateYmd,
      selectedTimeId,
      selectedVariants: { [CATEGORY_ID]: SHOP_SERVICE_ID },
      paymentMethodId: PAYMENT_METHOD_ID,
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/mobile/v1/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(bookingPayload)
      .expect(402);

    expect(createRes.body.success).toBe(true);
    const bookingId = createRes.body.data.bookingId as string;

    const payRes = await request(app.getHttpServer())
      .post(`/api/mobile/v1/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ paymentMethodId: PAYMENT_METHOD_ID })
      .expect(200);

    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.razorpayOrderId).toMatch(/^order_mock_/);
    expect(payRes.body.data.status).toBe('processing');

    const razorpayOrderId = payRes.body.data.razorpayOrderId as string;

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_e2e_test_1',
            order_id: razorpayOrderId,
            amount: 30000,
            status: 'captured',
          },
        },
      },
    };
    const bodyStr = JSON.stringify(webhookPayload);
    const signature = signWebhookBody(Buffer.from(bodyStr));

    const webhookRes = await request(app.getHttpServer())
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', signature)
      .set('X-Razorpay-Event-Id', 'evt_e2e_payment_1')
      .send(bodyStr)
      .expect(200);

    expect(webhookRes.body.success).toBe(true);

    const statusRes = await request(app.getHttpServer())
      .get(`/api/mobile/v1/bookings/${bookingId}/payment-status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(statusRes.body.data.paymentStatus).toBe('paid');
    expect(statusRes.body.data.bookingStatus).toBe('confirmed');

    const confirmRes = await request(app.getHttpServer())
      .get(`/api/mobile/v1/bookings/${bookingId}/confirmation`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(confirmRes.body.data.status).toBe('confirmed');
  });

  it('rejects webhook with invalid signature', async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: {} }));

    await request(app.getHttpServer())
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'invalid')
      .set('X-Razorpay-Event-Id', 'evt_bad_sig')
      .send(rawBody)
      .expect(401);
  });
});
