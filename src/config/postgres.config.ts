export interface PostgresPoolOptions {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface PostgresConnectionOptions {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl: boolean | { rejectUnauthorized: false };
  extra: PostgresPoolOptions;
}

function readPoolOptions(env: NodeJS.ProcessEnv): PostgresPoolOptions {
  return {
    max: parseInt(env['POSTGRES_POOL_MAX'] ?? '10', 10),
    min: parseInt(env['POSTGRES_POOL_MIN'] ?? '2', 10),
    idleTimeoutMillis: parseInt(env['POSTGRES_POOL_IDLE_TIMEOUT_MS'] ?? '30000', 10),
    connectionTimeoutMillis: parseInt(env['POSTGRES_POOL_CONNECTION_TIMEOUT_MS'] ?? '5000', 10),
  };
}

export function buildPostgresConnectionOptions(env: NodeJS.ProcessEnv): PostgresConnectionOptions {
  const extra = readPoolOptions(env);
  const ssl = env['POSTGRES_SSL'] === 'true' ? { rejectUnauthorized: false as const } : false;

  if (env['DATABASE_URL']) {
    return { url: env['DATABASE_URL'], ssl, extra };
  }

  return {
    host: env['POSTGRES_HOST'] ?? 'localhost',
    port: parseInt(env['POSTGRES_PORT'] ?? '5432', 10),
    username: env['POSTGRES_USER'],
    password: env['POSTGRES_PASSWORD'],
    database: env['POSTGRES_DB'],
    ssl,
    extra,
  };
}
