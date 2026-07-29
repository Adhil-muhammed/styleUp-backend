/**
 * Idempotent SQL seeder for StyleUp.
 *
 * Connection env mirrors flyway.config.js / postgres.config.ts:
 *   DATABASE_URL (preferred) or POSTGRES_* fallback; POSTGRES_SSL=true for SSL.
 *
 * Usage: pnpm seed
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const SEED_ROOT = __dirname;

function buildClientConfig() {
  const ssl =
    process.env.POSTGRES_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined;

  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'postgres',
    ssl,
  };
}

/**
 * @param {string} sql
 * @returns {number | null}
 */
function parseRowsHint(sql) {
  const match = sql.match(/^--\s*@rows\s+(\d+)\s*$/m);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}

/**
 * @param {string} fileName e.g. 01-users.sql → users
 */
function tableNameFromFile(fileName) {
  return fileName
    .replace(/^\d+-/, '')
    .replace(/\.sql$/, '')
    .replace(/-/g, '_');
}

/**
 * @returns {{ relativePath: string, absolutePath: string, table: string }[]}
 */
function discoverSeedFiles() {
  const entries = fs
    .readdirSync(SEED_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  /** @type {{ relativePath: string, absolutePath: string, table: string }[]} */
  const files = [];

  for (const dir of entries) {
    const dirPath = path.join(SEED_ROOT, dir);
    const sqlFiles = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of sqlFiles) {
      files.push({
        relativePath: path.join(dir, file),
        absolutePath: path.join(dirPath, file),
        table: tableNameFromFile(file),
      });
    }
  }

  return files;
}

async function main() {
  const seedFiles = discoverSeedFiles();
  if (seedFiles.length === 0) {
    console.error('No seed SQL files found under seed/');
    process.exit(1);
  }

  const client = new Client(buildClientConfig());

  /** @type {{ file: string, table: string, inserted: number, skipped: number }[]} */
  const summary = [];

  try {
    await client.connect();
    await client.query('BEGIN');

    for (const file of seedFiles) {
      const sql = fs.readFileSync(file.absolutePath, 'utf8');
      const expected = parseRowsHint(sql);
      console.log(`→ Running ${file.relativePath}`);

      const result = await client.query(sql);
      const inserted = result.rowCount ?? 0;
      const skipped =
        expected === null ? 0 : Math.max(0, expected - inserted);

      summary.push({
        file: file.relativePath,
        table: file.table,
        inserted,
        skipped,
      });

      console.log(
        `  ${file.table}: inserted=${inserted}` +
          (expected === null ? '' : `, skipped=${skipped}`),
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
    return;
  } finally {
    await client.end();
  }

  console.log('\nSeed summary');
  console.log('─'.repeat(72));
  console.log(
    `${'File'.padEnd(42)} ${'Table'.padEnd(18)} ${'Ins'.padStart(4)} ${'Skip'.padStart(5)}`,
  );
  console.log('─'.repeat(72));

  let totalInserted = 0;
  let totalSkipped = 0;
  for (const row of summary) {
    totalInserted += row.inserted;
    totalSkipped += row.skipped;
    console.log(
      `${row.file.padEnd(42)} ${row.table.padEnd(18)} ${String(row.inserted).padStart(4)} ${String(row.skipped).padStart(5)}`,
    );
  }
  console.log('─'.repeat(72));
  console.log(
    `${'TOTAL'.padEnd(42)} ${''.padEnd(18)} ${String(totalInserted).padStart(4)} ${String(totalSkipped).padStart(5)}`,
  );
  console.log('\nSeed completed successfully.');
}

main();
