import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  DATABASE_URL: Joi.string().uri().optional(),
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_USER: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_PASSWORD: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_DB: Joi.when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.string().required(),
  }),
  POSTGRES_SSL: Joi.boolean().default(false),
  POSTGRES_POOL_MAX: Joi.number().default(10),
  POSTGRES_POOL_MIN: Joi.number().default(2),
  POSTGRES_POOL_IDLE_TIMEOUT_MS: Joi.number().default(30000),
  POSTGRES_POOL_CONNECTION_TIMEOUT_MS: Joi.number().default(5000),
  MONGODB_URI: Joi.string().optional(),
  MONGO_PORT: Joi.number().default(27017),
  MONGO_DB: Joi.string().default('styleup'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_APP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().optional(),
  JWT_SECRET: Joi.string().optional(),
  JWT_ACCESS_SECRET: Joi.string().optional(),
  JWT_REFRESH_SECRET: Joi.string().optional(),
  JWT_ACCESS_EXPIRES_IN_SECONDS: Joi.number().default(900),
  JWT_REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(604800),
  JWT_EXPIRES_IN: Joi.string().optional(),
  AUTH_OTP_TTL_SECONDS: Joi.number().default(300),
  AUTH_OTP_RATE_MAX: Joi.number().default(3),
  AUTH_OTP_RATE_WINDOW_SECONDS: Joi.number().default(60),
  AUTH_OTP_MAX_VERIFY_ATTEMPTS: Joi.number().default(5),
  AUTH_OTP_IP_RATE_MAX: Joi.number().default(20),
  AUTH_OTP_IP_RATE_WINDOW_SECONDS: Joi.number().default(3600),
  AUTH_OTP_SMS_IP_RATE_MAX: Joi.number().default(10),
  AUTH_OTP_SMS_IP_RATE_WINDOW_SECONDS: Joi.number().default(3600),
  AUTH_OTP_DEVICE_RATE_MAX: Joi.number().default(20),
  AUTH_OTP_DEVICE_RATE_WINDOW_SECONDS: Joi.number().default(3600),
  AUTH_OTP_TEST_CODE: Joi.string()
    .pattern(/^\d{6}$/)
    .optional(),
  AUTH_SESSION_RETENTION_DAYS: Joi.number().default(7),
  AUTH_SESSION_CLEANUP_INTERVAL_MS: Joi.number().default(3600000),
  AUTH_SESSION_CLEANUP_ENABLED: Joi.boolean().default(true),
  RAZORPAY_KEY_ID: Joi.string().allow('').optional(),
  RAZORPAY_KEY_SECRET: Joi.string().allow('').optional(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  RAZORPAY_ENABLED: Joi.boolean().default(false),
  WHATSAPP_APP_SECRET: Joi.string().allow('').optional(),
  WHATSAPP_VERIFY_TOKEN: Joi.string().allow('').optional(),
  WHATSAPP_GRAPH_API_VERSION: Joi.string().default('v21.0'),
  MESSAGING_WHATSAPP_PROVIDER: Joi.string().valid('msg91', 'console').default('console'),
  MSG91_AUTH_KEY: Joi.string().allow('').optional(),
  MSG91_WHATSAPP_INTEGRATED_NUMBER: Joi.string().allow('').optional(),
  MSG91_NAMESPACE: Joi.string().allow('').optional(),
  MSG91_WHATSAPP_API_BASE: Joi.string().uri().default('https://control.msg91.com'),
  MSG91_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  MSG91_TEMPLATE_BOOKING_CONFIRMATION: Joi.string().allow('').optional(),
  MSG91_TEMPLATE_BOOKING_REMINDER: Joi.string().allow('').optional(),
  MSG91_TEMPLATE_BOOKING_CANCELLATION: Joi.string().allow('').optional(),
  BOOKING_CANCEL_MIN_HOURS_BEFORE: Joi.number().integer().min(0).default(2),
  AVATAR_MAX_BYTES: Joi.number()
    .integer()
    .min(1)
    .default(5 * 1024 * 1024),
  AVATAR_ALLOWED_MIME_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),
  AVATAR_PUBLIC_BASE_URL: Joi.string().uri().default('https://cdn.styleup.local/avatars'),
})
  .or('JWT_SECRET', 'JWT_ACCESS_SECRET')
  .messages({
    'object.missing': 'JWT_ACCESS_SECRET or JWT_SECRET is required',
  })
  .custom((value, helpers) => {
    if (value.MESSAGING_WHATSAPP_PROVIDER === 'msg91') {
      if (!value.MSG91_AUTH_KEY) {
        return helpers.error('any.custom', {
          message: 'MSG91_AUTH_KEY is required when MESSAGING_WHATSAPP_PROVIDER=msg91',
        });
      }
      if (!value.MSG91_WHATSAPP_INTEGRATED_NUMBER) {
        return helpers.error('any.custom', {
          message:
            'MSG91_WHATSAPP_INTEGRATED_NUMBER is required when MESSAGING_WHATSAPP_PROVIDER=msg91',
        });
      }
      if (!value.MSG91_NAMESPACE) {
        return helpers.error('any.custom', {
          message: 'MSG91_NAMESPACE is required when MESSAGING_WHATSAPP_PROVIDER=msg91',
        });
      }
    }
    return value;
  });
