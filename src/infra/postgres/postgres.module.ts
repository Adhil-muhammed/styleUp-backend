import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildPostgresConnectionOptions } from '@/config/postgres.config';
import { POSTGRES_ENTITIES } from '@/infra/persistence/postgres/entities';

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
          entities: POSTGRES_ENTITIES,
          // Migrations are CLI-only via package.json scripts; never auto-run on app boot.
          migrations: [],
        };
      },
    }),
  ],
})
export class PostgresModule {}
