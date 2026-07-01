import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildPostgresConnectionOptions } from '@/config/postgres.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connection = buildPostgresConnectionOptions(process.env);

        return {
          type: 'postgres' as const,
          ...connection,
          synchronize: false,
          logging: configService.get<string>('nodeEnv') !== 'production',
          entities: [],
          migrations: [],
        };
      },
    }),
  ],
})
export class PostgresModule {}
