import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { assertTestEnv } from './assert-test-env';

const EXCLUDED_TABLES = [
  'flyway_schema_history',
  'roles', // Flyway-seeded system roles (e.g. customer) required by signup
  'spatial_ref_sys', // PostGIS catalog — not app data
];

export async function truncatePostgres(app: INestApplication): Promise<void> {
  assertTestEnv();
  const dataSource = app.get(DataSource);

  const rows = (await dataSource.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'`,
  )) as Array<{ tablename: string }>;

  const tables = rows.map((row) => row.tablename).filter((name) => !EXCLUDED_TABLES.includes(name));

  if (tables.length === 0) {
    return;
  }

  const quoted = tables.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}
