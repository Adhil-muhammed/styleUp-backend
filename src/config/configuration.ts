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
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? process.env['JWT_SECRET'],
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? process.env['JWT_SECRET'],
    accessExpiresInSeconds: parseInt(process.env['JWT_ACCESS_EXPIRES_IN_SECONDS'] ?? '900', 10),
    refreshExpiresInSeconds: parseInt(
      process.env['JWT_REFRESH_EXPIRES_IN_SECONDS'] ?? '604800',
      10,
    ),
  },
  auth: {
    otpTtlSeconds: parseInt(process.env['AUTH_OTP_TTL_SECONDS'] ?? '300', 10),
    otpRateMax: parseInt(process.env['AUTH_OTP_RATE_MAX'] ?? '3', 10),
    otpRateWindowSeconds: parseInt(process.env['AUTH_OTP_RATE_WINDOW_SECONDS'] ?? '60', 10),
    otpMaxVerifyAttempts: parseInt(process.env['AUTH_OTP_MAX_VERIFY_ATTEMPTS'] ?? '5', 10),
    otpIpRateMax: parseInt(process.env['AUTH_OTP_IP_RATE_MAX'] ?? '20', 10),
    otpIpRateWindowSeconds: parseInt(process.env['AUTH_OTP_IP_RATE_WINDOW_SECONDS'] ?? '3600', 10),
    otpSmsIpRateMax: parseInt(process.env['AUTH_OTP_SMS_IP_RATE_MAX'] ?? '10', 10),
    otpSmsIpRateWindowSeconds: parseInt(
      process.env['AUTH_OTP_SMS_IP_RATE_WINDOW_SECONDS'] ?? '3600',
      10,
    ),
    otpDeviceRateMax: parseInt(process.env['AUTH_OTP_DEVICE_RATE_MAX'] ?? '20', 10),
    otpDeviceRateWindowSeconds: parseInt(
      process.env['AUTH_OTP_DEVICE_RATE_WINDOW_SECONDS'] ?? '3600',
      10,
    ),
    sessionRetentionDays: parseInt(process.env['AUTH_SESSION_RETENTION_DAYS'] ?? '7', 10),
    sessionCleanupIntervalMs: parseInt(
      process.env['AUTH_SESSION_CLEANUP_INTERVAL_MS'] ?? String(60 * 60 * 1000),
      10,
    ),
    sessionCleanupEnabled: process.env['AUTH_SESSION_CLEANUP_ENABLED'] !== 'false',
  },
  razorpay: {
    keyId: process.env['RAZORPAY_KEY_ID'],
    keySecret: process.env['RAZORPAY_KEY_SECRET'],
  },
});
