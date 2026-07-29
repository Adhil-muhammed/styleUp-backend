import { AuthTokenPair, OtpSession, User, UserSession } from '@/modules/auth/domain/types';

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'Demo User',
    avatarUrl: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createOtpSession(overrides: Partial<OtpSession> = {}): OtpSession {
  return {
    id: 'otp-session-1',
    method: 'email',
    contact: 'user@example.com',
    otpHash: 'otp-hash',
    isNewUser: false,
    userId: 'user-1',
    attempts: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTokenPair(overrides: Partial<AuthTokenPair> = {}): AuthTokenPair {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessExpiresInSeconds: 900,
    refreshExpiresInSeconds: 604800,
    ...overrides,
  };
}

export function createUserSession(overrides: Partial<UserSession> = {}): UserSession {
  return {
    id: 'session-1',
    userId: 'user-1',
    deviceId: 'device-1',
    refreshToken: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() + 60_000),
    isRevoked: false,
    createdAt: new Date(),
    ...overrides,
  };
}
