import { OtpMethod, OtpSession } from '@/modules/auth/domain/types';

export interface CreateOtpSessionInput {
  method: OtpMethod;
  contact: string;
  otpHash: string;
  isNewUser: boolean;
  userId: string | null;
  ttlSeconds: number;
}

export interface OtpStorePort {
  createSession(input: CreateOtpSessionInput): Promise<OtpSession>;
  getSession(sessionId: string): Promise<OtpSession | null>;
  replaceOtp(sessionId: string, otpHash: string, ttlSeconds: number): Promise<OtpSession | null>;
  incrementAttempts(sessionId: string): Promise<number>;
  deleteSession(sessionId: string): Promise<void>;
  /** Returns true when the rate bucket is within the allowed window. */
  consumeRateLimit(bucketKey: string, maxAttempts: number, windowSeconds: number): Promise<boolean>;
}

export const OTP_STORE = Symbol('OTP_STORE');
