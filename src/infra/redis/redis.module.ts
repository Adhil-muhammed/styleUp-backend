import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('Redis');
        const url = configService.get<string>('redis.url');
        const options = {
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
        } as const;

        const client = url
          ? new Redis(url, options)
          : new Redis({
              host: configService.get<string>('redis.host'),
              port: configService.get<number>('redis.port'),
              password: configService.get<string>('redis.password') || undefined,
              ...options,
            });

        client.on('error', (err: Error) => {
          logger.error(err.message);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
