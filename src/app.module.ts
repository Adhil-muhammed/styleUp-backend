import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import configuration from '@/config/configuration';
import { envValidationSchema } from '@/config/env.validation';
import { PostgresModule } from '@/infra/postgres/postgres.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { HealthModule } from '@/health/health.module';
import { AuthModule } from '@/modules/auth';
import { DiscoveryModule } from '@/modules/discovery';
import { RatingModule } from '@/modules/rating/rating.module';
import { ShopsModule } from '@/modules/shops';
import { BookingsModule } from '@/modules/bookings';
import { PaymentsModule } from '@/modules/payments';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env['NODE_ENV'] === 'test' ? '.env.test' : '.env',
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        return url
          ? { connection: { url } }
          : {
              connection: {
                host: config.get<string>('redis.host'),
                port: config.get<number>('redis.port'),
                password: config.get<string>('redis.password') || undefined,
              },
            };
      },
    }),
    PostgresModule,
    RedisModule,
    AuthModule,
    DiscoveryModule,
    ShopsModule,
    BookingsModule,
    PaymentsModule,
    RatingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
