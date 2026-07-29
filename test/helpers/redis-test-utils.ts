import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/infra/redis/redis.module';
import { assertTestEnv } from './assert-test-env';

export async function clearRedis(app: INestApplication): Promise<void> {
  assertTestEnv();
  const redis = app.get<Redis>(REDIS_CLIENT);
  await redis.flushdb();
}
