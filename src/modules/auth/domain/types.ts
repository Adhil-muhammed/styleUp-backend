export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
}

export type OtpMethod = 'email' | 'sms';

export interface OtpSession {
  id: string;
  method: OtpMethod;
  contact: string;
  otpHash: string;
  isNewUser: boolean;
  userId: string | null;
  attempts: number;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  refreshToken: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface AccessTokenClaims {
  sub: string;
  jti: string;
  exp: number;
  iat: number;
}

export type SocialProvider = 'google' | 'apple';

export interface SocialIdentity {
  provider: SocialProvider;
  providerId: string;
  email: string | null;
  displayName: string | null;
  /** When true, email may be used to auto-link an existing OTP account. */
  emailVerified: boolean;
}
