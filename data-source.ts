import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { buildPostgresConnectionOptions } from './src/config/postgres.config';

dotenv.config();

const connection = buildPostgresConnectionOptions(process.env);

export default new DataSource({
  type: 'postgres',
  ...connection,
  entities: [],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
