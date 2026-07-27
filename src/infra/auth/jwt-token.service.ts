import { createHash, randomBytes, randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/infra/redis/redis.module';
import { AccessTokenClaims, AuthTokenPair } from '@/modules/auth/domain/types';
import { TokenServicePort } from '@/modules/auth/ports/token.service.port';

const BLOCKLIST_PREFIX = 'blocklist:';

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.accessExpiresInSeconds = this.config.get<number>('jwt.accessExpiresInSeconds') ?? 900;
    this.refreshExpiresInSeconds = this.config.get<number>('jwt.refreshExpiresInSeconds') ?? 604800;
  }

  async issueTokenPair(userId: string): Promise<AuthTokenPair> {
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.accessExpiresInSeconds,
      },
    );
    const refreshToken = this.generateRefreshToken();
    return {
      accessToken,
      refreshToken,
      accessExpiresInSeconds: this.accessExpiresInSeconds,
      refreshExpiresInSeconds: this.refreshExpiresInSeconds,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const payload: unknown = await this.jwt.verifyAsync(token, {
      secret: this.config.getOrThrow<string>('jwt.accessSecret'),
    });
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Invalid access token payload');
    }
    const record = payload as Record<string, unknown>;
    if (
      typeof record['sub'] !== 'string' ||
      typeof record['jti'] !== 'string' ||
      typeof record['exp'] !== 'number' ||
      typeof record['iat'] !== 'number'
    ) {
      throw new Error('Invalid access token claims');
    }
    return {
      sub: record['sub'],
      jti: record['jti'],
      exp: record['exp'],
      iat: record['iat'],
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  async blockAccessToken(jti: string, expiresAtEpochSeconds: number): Promise<void> {
    const ttlMs = expiresAtEpochSeconds * 1000 - Date.now();
    if (ttlMs <= 0) {
      return;
    }
    await this.redis.set(`${BLOCKLIST_PREFIX}${jti}`, '1', 'PX', ttlMs);
  }

  async isAccessTokenBlocked(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`${BLOCKLIST_PREFIX}${jti}`);
    return exists === 1;
  }
}
