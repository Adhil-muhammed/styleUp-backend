import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { buildPostgresConnectionOptions } from './src/config/postgres.config';
import { AuthUserEntity } from './src/infra/persistence/postgres/auth/auth-user.entity';

dotenv.config();

const connection = buildPostgresConnectionOptions(process.env);

export default new DataSource({
  type: 'postgres',
  ...connection,
  entities: [AuthUserEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
