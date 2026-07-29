import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { truncatePostgres } from './helpers/postgres-test-utils';
import { clearRedis } from './helpers/redis-test-utils';

function uniquePhone(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `+91${suffix}`;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(30_000);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncatePostgres(app);
    await clearRedis(app);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('completes otp -> verify -> refresh -> logout flow', async () => {
    const contact = uniquePhone();

    const otpRequestResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({
        contact,
        method: 'sms',
        deviceId: 'device-auth-flow',
      })
      .expect(200);

    expect(otpRequestResponse.body.success).toBe(true);
    expect(otpRequestResponse.body.data.otpSessionId).toBeDefined();

    const verifyResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/verify')
      .send({
        otpSessionId: otpRequestResponse.body.data.otpSessionId,
        action: 'verify',
        otp: '123456',
        displayName: 'Auth E2E User',
        deviceId: 'device-auth-flow',
      })
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.data.tokens.accessToken).toBeDefined();
    expect(verifyResponse.body.data.tokens.refreshToken).toBeDefined();

    const refreshToken: string = verifyResponse.body.data.tokens.refreshToken;
    const accessToken: string = verifyResponse.body.data.tokens.accessToken;

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/token/refresh')
      .send({
        refreshToken,
        deviceId: 'device-auth-flow',
      })
      .expect(200);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/token/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('returns INVALID_OTP on wrong code', async () => {
    const otpRequestResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({
        contact: uniquePhone(),
        method: 'sms',
      })
      .expect(200);

    const verifyResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/verify')
      .send({
        otpSessionId: otpRequestResponse.body.data.otpSessionId,
        action: 'verify',
        otp: '000000',
      })
      .expect(400);

    expect(verifyResponse.body.success).toBe(false);
    expect(verifyResponse.body.error.code).toBe('INVALID_OTP');
  });

  it('rate limits repeated otp requests', async () => {
    const contact = uniquePhone();

    await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({ contact, method: 'sms' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({ contact, method: 'sms' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({ contact, method: 'sms' })
      .expect(200);

    const rateLimitedResponse = await request(app.getHttpServer())
      .post('/api/mobile/v1/auth/otp/request')
      .send({ contact, method: 'sms' })
      .expect(429);

    expect(rateLimitedResponse.body.success).toBe(false);
    expect(rateLimitedResponse.body.error.code).toBe('OTP_RATE_LIMITED');
  });
});
