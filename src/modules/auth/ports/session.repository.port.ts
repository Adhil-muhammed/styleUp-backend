import { UserSession } from '@/modules/auth/domain/types';

export interface CreateSessionInput {
  userId: string;
  deviceId: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SessionRepositoryPort {
  create(input: CreateSessionInput): Promise<UserSession>;
  findByRefreshToken(refreshToken: string): Promise<UserSession | null>;
  revoke(id: string): Promise<void>;
  revokeByRefreshToken(refreshToken: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  /** Deletes revoked sessions and sessions expired past the retention window. */
  deleteExpiredAndRevoked(retentionDays: number): Promise<number>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
