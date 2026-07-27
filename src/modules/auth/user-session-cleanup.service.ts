import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_REPOSITORY, SessionRepositoryPort } from '@/modules/auth/ports';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Periodically deletes revoked and long-expired user_sessions rows.
 * Uses a native timer (no BullMQ / @nestjs/schedule dependency).
 */
@Injectable()
export class UserSessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserSessionCleanupService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly retentionDays: number;
  private readonly intervalMs: number;
  private readonly enabled: boolean;

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepositoryPort,
    config: ConfigService,
  ) {
    this.retentionDays = config.get<number>('auth.sessionRetentionDays') ?? 7;
    this.intervalMs = config.get<number>('auth.sessionCleanupIntervalMs') ?? ONE_HOUR_MS;
    this.enabled = config.get<boolean>('auth.sessionCleanupEnabled') ?? true;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('User session cleanup disabled');
      return;
    }
    void this.purge();
    this.timer = setInterval(() => {
      void this.purge();
    }, this.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async purge(): Promise<void> {
    try {
      const deleted = await this.sessions.deleteExpiredAndRevoked(this.retentionDays);
      if (deleted > 0) {
        this.logger.log(`Purged ${deleted} expired/revoked user_sessions`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`User session cleanup failed: ${message}`);
    }
  }
}
