/**
 * Flyway configuration for StyleUp Backend.
 *
 * Reads from the same env vars already used by postgres.config.ts:
 *   - DATABASE_URL (preferred, Supabase connection string)
 *   - POSTGRES_HOST / POSTGRES_PORT / POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB (fallback)
 *   - POSTGRES_SSL (adds ?sslmode=require when 'true')
 *
 * Run via: pnpm migrate | pnpm migrate:info | pnpm migrate:validate | pnpm migrate:repair
 */

require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

/**
 * Parses DATABASE_URL (postgresql://user:pass@host:port/db[?params]) into JDBC
 * components. Returns null if the URL is absent or cannot be parsed.
 */
function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) return null;
  const match = rawUrl.match(
    /^(?:postgresql|postgres):\/\/([^:@]*):([^@]*)@([^:/]+):(\d+)\/([^?]+)/,
  );
  if (!match) return null;
  const [, user, password, host, port, db] = match;
  return { user, password, host, port, db };
}

function buildConnection() {
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  const ssl = process.env.POSTGRES_SSL === 'true';

  if (parsed) {
    const sslParam = ssl ? '?sslmode=require' : '';
    return {
      url: `jdbc:postgresql://${parsed.host}:${parsed.port}/${parsed.db}${sslParam}`,
      user: parsed.user,
      password: parsed.password,
    };
  }

  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'postgres';
  const sslParam = ssl ? '?sslmode=require' : '';

  return {
    url: `jdbc:postgresql://${host}:${port}/${db}${sslParam}`,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };
}

const { url, user, password } = buildConnection();

module.exports = {
  flywayArgs: {
    url,
    user,
    password,
    locations: 'filesystem:db/migrations',
    defaultSchema: 'public',
    table: 'flyway_schema_history',
    validateOnMigrate: true,
    connectRetries: 3,
    outOfOrder: false,
  },
  // Flyway CLI binary is cached in .flyway/ (git-ignored)
  downloads: {
    storageDirectory: '.flyway',
    expirationTimeInMs: -1,
  },
};
