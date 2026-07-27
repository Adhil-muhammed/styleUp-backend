import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSessionEntity } from '@/infra/persistence/postgres/auth/user-session.entity';
import { UserSession } from '@/modules/auth/domain/types';
import {
  CreateSessionInput,
  SessionRepositoryPort,
} from '@/modules/auth/ports/session.repository.port';

@Injectable()
export class TypeOrmSessionRepository implements SessionRepositoryPort {
  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly sessions: Repository<UserSessionEntity>,
  ) {}

  async create(input: CreateSessionInput): Promise<UserSession> {
    const row = this.sessions.create({
      userId: input.userId,
      deviceId: input.deviceId,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      isRevoked: false,
    });
    const saved = await this.sessions.save(row);
    return this.toDomain(saved);
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const row = await this.sessions.findOne({ where: { refreshToken } });
    return row ? this.toDomain(row) : null;
  }

  async revoke(id: string): Promise<void> {
    await this.sessions.update({ id }, { isRevoked: true });
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    await this.sessions.update({ refreshToken }, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async deleteExpiredAndRevoked(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.sessions
      .createQueryBuilder()
      .delete()
      .from(UserSessionEntity)
      .where('is_revoked = TRUE')
      .orWhere('expires_at < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }

  private toDomain(row: UserSessionEntity): UserSession {
    return {
      id: row.id,
      userId: row.userId,
      deviceId: row.deviceId,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      isRevoked: row.isRevoked,
      createdAt: row.createdAt,
    };
  }
}
