import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/infra/redis/redis.module';
import { OtpSession } from '@/modules/auth/domain/types';
import { CreateOtpSessionInput, OtpStorePort } from '@/modules/auth/ports/otp-store.port';

const SESSION_PREFIX = 'otp_session:';
const RATE_PREFIX = 'otp_rate:';

@Injectable()
export class RedisOtpStore implements OtpStorePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async createSession(input: CreateOtpSessionInput): Promise<OtpSession> {
    const id = randomUUID();
    const session: OtpSession = {
      id,
      method: input.method,
      contact: input.contact,
      otpHash: input.otpHash,
      isNewUser: input.isNewUser,
      userId: input.userId,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(`${SESSION_PREFIX}${id}`, JSON.stringify(session), 'EX', input.ttlSeconds);
    return session;
  }

  async getSession(sessionId: string): Promise<OtpSession | null> {
    const raw = await this.redis.get(`${SESSION_PREFIX}${sessionId}`);
    if (!raw) {
      return null;
    }
    return this.parseSession(raw);
  }

  async replaceOtp(
    sessionId: string,
    otpHash: string,
    ttlSeconds: number,
  ): Promise<OtpSession | null> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      return null;
    }
    const updated: OtpSession = {
      ...existing,
      otpHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(
      `${SESSION_PREFIX}${sessionId}`,
      JSON.stringify(updated),
      'EX',
      ttlSeconds,
    );
    return updated;
  }

  async incrementAttempts(sessionId: string): Promise<number> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      return 0;
    }
    const ttl = await this.redis.ttl(`${SESSION_PREFIX}${sessionId}`);
    const attempts = existing.attempts + 1;
    const updated: OtpSession = { ...existing, attempts };
    const expireSeconds = ttl > 0 ? ttl : 1;
    await this.redis.set(
      `${SESSION_PREFIX}${sessionId}`,
      JSON.stringify(updated),
      'EX',
      expireSeconds,
    );
    return attempts;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`${SESSION_PREFIX}${sessionId}`);
  }

  async consumeRateLimit(
    bucketKey: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `${RATE_PREFIX}${bucketKey}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return count <= maxAttempts;
  }

  private parseSession(raw: string): OtpSession {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Corrupt OTP session payload');
    }
    const record = parsed as Record<string, unknown>;
    return {
      id: String(record['id']),
      method: record['method'] === 'sms' ? 'sms' : 'email',
      contact: String(record['contact']),
      otpHash: String(record['otpHash']),
      isNewUser: Boolean(record['isNewUser']),
      userId:
        record['userId'] === null || record['userId'] === undefined
          ? null
          : String(record['userId']),
      attempts: Number(record['attempts'] ?? 0),
      createdAt: String(record['createdAt']),
    };
  }
}
