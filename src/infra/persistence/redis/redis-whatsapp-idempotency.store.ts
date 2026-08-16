import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/infra/redis/redis.module';
import { WhatsappIdempotencyStorePort } from '@/modules/whatsapp/ports/whatsapp-idempotency.port';

const KEY_PREFIX = 'whatsapp:idempotency:';

/**
 * Redis-backed idempotency store for WhatsApp webhook deduplication.
 *
 * Idempotency keys MUST be checked in the BullMQ processor (not the controller)
 * so Meta receives a fast 200 even when Redis is briefly contended — duplicate
 * jobs are cheap no-ops after the first successful claim.
 */
@Injectable()
export class RedisWhatsappIdempotencyStore implements WhatsappIdempotencyStorePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async tryClaim(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(`${KEY_PREFIX}${key}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
}
