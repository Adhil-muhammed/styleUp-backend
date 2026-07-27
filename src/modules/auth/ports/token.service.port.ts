import { AccessTokenClaims, AuthTokenPair } from '@/modules/auth/domain/types';

export interface TokenServicePort {
  issueTokenPair(userId: string): Promise<AuthTokenPair>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
  hashRefreshToken(token: string): string;
  generateRefreshToken(): string;
  blockAccessToken(jti: string, expiresAtEpochSeconds: number): Promise<void>;
  isAccessTokenBlocked(jti: string): Promise<boolean>;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
