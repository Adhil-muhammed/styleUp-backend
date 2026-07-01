export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  apiPrefix: process.env['API_PREFIX'] ?? 'api',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? '').split(',').filter(Boolean),
  postgres: {
    databaseUrl: process.env['DATABASE_URL'],
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
    username: process.env['POSTGRES_USER'],
    password: process.env['POSTGRES_PASSWORD'],
    database: process.env['POSTGRES_DB'],
    ssl: process.env['POSTGRES_SSL'] === 'true',
    pool: {
      max: parseInt(process.env['POSTGRES_POOL_MAX'] ?? '10', 10),
      min: parseInt(process.env['POSTGRES_POOL_MIN'] ?? '2', 10),
      idleTimeoutMillis: parseInt(process.env['POSTGRES_POOL_IDLE_TIMEOUT_MS'] ?? '30000', 10),
      connectionTimeoutMillis: parseInt(
        process.env['POSTGRES_POOL_CONNECTION_TIMEOUT_MS'] ?? '5000',
        10,
      ),
    },
  },
  mongodb: {
    uri: process.env['MONGODB_URI'],
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] || undefined,
  },
  jwt: {
    secret: process.env['JWT_SECRET'],
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  },
  razorpay: {
    keyId: process.env['RAZORPAY_KEY_ID'],
    keySecret: process.env['RAZORPAY_KEY_SECRET'],
  },
});
