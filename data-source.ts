import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { buildPostgresConnectionOptions } from './src/config/postgres.config';
import { POSTGRES_ENTITIES } from './src/infra/persistence/postgres/entities';

dotenv.config();

const connection = buildPostgresConnectionOptions(process.env);

export default new DataSource({
  type: 'postgres',
  ...connection,
  entities: POSTGRES_ENTITIES,
  // Schema is owned by Flyway (db/migrations/V*.sql). TypeORM never runs migrations.
  migrations: [],
  synchronize: false,
});
