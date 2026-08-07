import { createHash, randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import { AuthTokenPair, OtpMethod, SocialProvider, User } from '@/modules/auth/domain/types';
import {
  OTP_STORE,
  OtpStorePort,
  SESSION_REPOSITORY,
  SessionRepositoryPort,
  SMS_SENDER,
  SmsSenderPort,
  SOCIAL_TOKEN_VERIFIER,
  SocialTokenVerifierPort,
  TOKEN_SERVICE,
  TokenServicePort,
  USER_REPOSITORY,
  UserRepositoryPort,
} from '@/modules/auth/ports';
import { OtpEmailProducerService } from '@/modules/auth/otp-email-producer.service';

const DEFAULT_DEVICE_ID = 'unknown';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RequestOtpResult {
  otpSessionId: string;
  maskedContact: string;
  expiresInSeconds: number;
}

export interface VerifyOtpVerifyResult {
  user: User;
  tokens: AuthTokenPair;
  isNewUser: boolean;
}

export interface VerifyOtpResendResult {
  maskedContact: string;
  expiresInSeconds: number;
}

export interface SocialLoginResult {
  user: User;
  tokens: AuthTokenPair;
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds: number;
  private readonly otpRateMax: number;
  private readonly otpRateWindowSeconds: number;
  private readonly otpMaxVerifyAttempts: number;
  private readonly otpIpRateMax: number;
  private readonly otpIpRateWindowSeconds: number;
  private readonly otpSmsIpRateMax: number;
  private readonly otpSmsIpRateWindowSeconds: number;
  private readonly otpDeviceRateMax: number;
  private readonly otpDeviceRateWindowSeconds: number;
  private readonly otpTestCode?: string;
  private readonly refreshExpiresInSeconds: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepositoryPort,
    @Inject(OTP_STORE) private readonly otpStore: OtpStorePort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSenderPort,
    @Inject(SOCIAL_TOKEN_VERIFIER) private readonly socialVerifier: SocialTokenVerifierPort,
    private readonly otpEmailProducer: OtpEmailProducerService,
    private readonly config: ConfigService,
  ) {
    this.otpTtlSeconds = this.config.get<number>('auth.otpTtlSeconds') ?? 300;
    this.otpRateMax = this.config.get<number>('auth.otpRateMax') ?? 3;
    this.otpRateWindowSeconds = this.config.get<number>('auth.otpRateWindowSeconds') ?? 60;
    this.otpMaxVerifyAttempts = this.config.get<number>('auth.otpMaxVerifyAttempts') ?? 5;
    this.otpIpRateMax = this.config.get<number>('auth.otpIpRateMax') ?? 20;
    this.otpIpRateWindowSeconds = this.config.get<number>('auth.otpIpRateWindowSeconds') ?? 3600;
    this.otpSmsIpRateMax = this.config.get<number>('auth.otpSmsIpRateMax') ?? 10;
    this.otpSmsIpRateWindowSeconds =
      this.config.get<number>('auth.otpSmsIpRateWindowSeconds') ?? 3600;
    this.otpDeviceRateMax = this.config.get<number>('auth.otpDeviceRateMax') ?? 20;
    this.otpDeviceRateWindowSeconds =
      this.config.get<number>('auth.otpDeviceRateWindowSeconds') ?? 3600;
    this.otpTestCode = this.config.get<string>('auth.otpTestCode');
    this.refreshExpiresInSeconds = this.config.get<number>('jwt.refreshExpiresInSeconds') ?? 604800;
  }

  async requestOtp(input: {
    contact: string;
    method: OtpMethod;
    clientIp?: string;
    deviceId?: string;
  }): Promise<RequestOtpResult> {
    const contact = this.normalizeContact(input.contact, input.method);
    await this.assertOtpRateLimits({
      contact,
      method: input.method,
      clientIp: input.clientIp,
      deviceId: input.deviceId,
    });

    const existing =
      input.method === 'email'
        ? await this.users.findByEmail(contact)
        : await this.users.findByPhone(contact);

    const otp = this.generateOtp();
    const session = await this.otpStore.createSession({
      method: input.method,
      contact,
      otpHash: this.hashOtp(otp),
      isNewUser: existing === null,
      userId: existing?.id ?? null,
      ttlSeconds: this.otpTtlSeconds,
    });

    await this.dispatchOtp(input.method, contact, otp);

    return {
      otpSessionId: session.id,
      maskedContact: this.maskContact(contact, input.method),
      expiresInSeconds: this.otpTtlSeconds,
    };
  }

  async verifyOtp(input: {
    otpSessionId: string;
    action: 'verify' | 'resend';
    otp?: string;
    displayName?: string;
    deviceId?: string;
    clientIp?: string;
  }): Promise<VerifyOtpVerifyResult | VerifyOtpResendResult> {
    const session = await this.otpStore.getSession(input.otpSessionId);
    if (!session) {
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: 'Wrong or expired OTP',
      });
    }

    if (input.action === 'resend') {
      await this.assertOtpRateLimits({
        contact: session.contact,
        method: session.method,
        clientIp: input.clientIp,
        deviceId: input.deviceId,
      });
      const otp = this.generateOtp();
      const updated = await this.otpStore.replaceOtp(
        session.id,
        this.hashOtp(otp),
        this.otpTtlSeconds,
      );
      if (!updated) {
        throw new BadRequestException({
          code: 'INVALID_OTP',
          message: 'Wrong or expired OTP',
        });
      }
      await this.dispatchOtp(session.method, session.contact, otp);
      return {
        maskedContact: this.maskContact(session.contact, session.method),
        expiresInSeconds: this.otpTtlSeconds,
      };
    }

    if (!input.otp) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'otp is required when action is verify',
      });
    }

    if (this.hashOtp(input.otp) !== session.otpHash) {
      const attempts = await this.otpStore.incrementAttempts(session.id);
      if (attempts >= this.otpMaxVerifyAttempts) {
        await this.otpStore.deleteSession(session.id);
      }
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: 'Wrong or expired OTP',
      });
    }

    await this.otpStore.deleteSession(session.id);

    const now = new Date();
    const existing =
      session.method === 'email'
        ? await this.users.findByEmail(session.contact)
        : await this.users.findByPhone(session.contact);

    let user: User;
    let isNewUser = false;

    if (existing) {
      if (!existing.isActive) {
        throw new UnauthorizedException({
          code: 'INVALID_OTP',
          message: 'Wrong or expired OTP',
        });
      }
      if (session.method === 'email') {
        await this.users.markEmailVerified(existing.id, now);
      } else {
        await this.users.markPhoneVerified(existing.id, now);
      }
      user = existing;
    } else {
      const displayName = input.displayName?.trim();
      if (!displayName) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'displayName is required for new users',
        });
      }

      try {
        user = await this.users.createCustomerUser({
          email: session.method === 'email' ? session.contact : null,
          phone: session.method === 'sms' ? session.contact : null,
          displayName,
          emailVerifiedAt: session.method === 'email' ? now : null,
          phoneVerifiedAt: session.method === 'sms' ? now : null,
        });
        isNewUser = true;
      } catch (error: unknown) {
        if (!(error instanceof UniqueContactConflictError)) {
          throw error;
        }
        const raced =
          session.method === 'email'
            ? await this.users.findByEmail(session.contact)
            : await this.users.findByPhone(session.contact);
        if (!raced || !raced.isActive) {
          throw new ConflictException({
            code: 'CONTACT_CONFLICT',
            message: 'Account already exists for this contact',
          });
        }
        if (session.method === 'email') {
          await this.users.markEmailVerified(raced.id, now);
        } else {
          await this.users.markPhoneVerified(raced.id, now);
        }
        user = raced;
        isNewUser = false;
      }
    }

    const tokens = await this.issueSessionTokens(user.id, input.deviceId);
    return { user, tokens, isNewUser };
  }

  async refresh(refreshToken: string, deviceId?: string): Promise<{ tokens: AuthTokenPair }> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.sessions.findByRefreshToken(tokenHash);
    if (!session || session.isRevoked || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Expired or revoked refresh token',
      });
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Expired or revoked refresh token',
      });
    }

    await this.sessions.revoke(session.id);
    const tokens = await this.issueSessionTokens(user.id, deviceId ?? session.deviceId);
    return { tokens };
  }

  async logout(input: {
    userId: string;
    accessJti: string;
    accessExp: number;
    refreshToken?: string;
  }): Promise<{ success: true }> {
    if (input.refreshToken) {
      const tokenHash = this.tokens.hashRefreshToken(input.refreshToken);
      await this.sessions.revokeByRefreshToken(tokenHash);
    } else {
      await this.sessions.revokeAllForUser(input.userId);
    }
    await this.tokens.blockAccessToken(input.accessJti, input.accessExp);
    return { success: true };
  }

  async socialLogin(
    provider: SocialProvider,
    idToken: string,
    deviceId?: string,
    displayName?: string,
  ): Promise<SocialLoginResult> {
    let identity;
    try {
      identity = await this.socialVerifier.verify(provider, idToken);
    } catch {
      throw new UnauthorizedException({
        code: 'SOCIAL_AUTH_FAILED',
        message: 'Invalid provider token',
      });
    }

    const byIdentity = await this.users.findByIdentity(identity.provider, identity.providerId);
    if (byIdentity) {
      const tokens = await this.issueSessionTokens(byIdentity.id, deviceId);
      return { user: byIdentity, tokens, isNewUser: false };
    }

    if (identity.email) {
      const byEmail = await this.users.findByEmail(identity.email.toLowerCase());
      if (byEmail) {
        if (!identity.emailVerified) {
          throw new UnauthorizedException({
            code: 'SOCIAL_EMAIL_UNVERIFIED',
            message: 'Provider email is not verified; cannot link to existing account',
          });
        }
        await this.users.linkIdentity(byEmail.id, identity.provider, identity.providerId);
        const tokens = await this.issueSessionTokens(byEmail.id, deviceId);
        return { user: byEmail, tokens, isNewUser: false };
      }
    }

    const email =
      identity.email?.toLowerCase() ??
      `${provider}.${identity.providerId.slice(0, 12)}@social.local`;
    const name =
      displayName?.trim() ||
      identity.displayName?.trim() ||
      email.split('@')[0] ||
      `${provider} user`;

    try {
      const user = await this.users.createCustomerUser({
        email,
        phone: null,
        displayName: name,
        emailVerifiedAt: identity.emailVerified && identity.email ? new Date() : null,
        phoneVerifiedAt: null,
      });
      await this.users.linkIdentity(user.id, identity.provider, identity.providerId);
      const tokens = await this.issueSessionTokens(user.id, deviceId);
      return { user, tokens, isNewUser: true };
    } catch (error: unknown) {
      if (!(error instanceof UniqueContactConflictError)) {
        throw error;
      }
      const raced = await this.users.findByEmail(email);
      if (!raced) {
        throw new ConflictException({
          code: 'CONTACT_CONFLICT',
          message: 'Account already exists for this contact',
        });
      }
      if (identity.emailVerified) {
        await this.users.linkIdentity(raced.id, identity.provider, identity.providerId);
        const tokens = await this.issueSessionTokens(raced.id, deviceId);
        return { user: raced, tokens, isNewUser: false };
      }
      throw new UnauthorizedException({
        code: 'SOCIAL_EMAIL_UNVERIFIED',
        message: 'Provider email is not verified; cannot link to existing account',
      });
    }
  }

  private async assertOtpRateLimits(input: {
    contact: string;
    method: OtpMethod;
    clientIp?: string;
    deviceId?: string;
  }): Promise<void> {
    const contactAllowed = await this.otpStore.consumeRateLimit(
      `contact:${input.contact}`,
      this.otpRateMax,
      this.otpRateWindowSeconds,
    );
    if (!contactAllowed) {
      this.throwOtpRateLimited();
    }

    const ip = input.clientIp?.trim();
    if (ip) {
      const ipMax = input.method === 'sms' ? this.otpSmsIpRateMax : this.otpIpRateMax;
      const ipWindow =
        input.method === 'sms' ? this.otpSmsIpRateWindowSeconds : this.otpIpRateWindowSeconds;
      const ipAllowed = await this.otpStore.consumeRateLimit(`ip:${ip}`, ipMax, ipWindow);
      if (!ipAllowed) {
        this.throwOtpRateLimited();
      }
    }

    const deviceId = input.deviceId?.trim();
    if (deviceId) {
      const deviceAllowed = await this.otpStore.consumeRateLimit(
        `device:${deviceId}`,
        this.otpDeviceRateMax,
        this.otpDeviceRateWindowSeconds,
      );
      if (!deviceAllowed) {
        this.throwOtpRateLimited();
      }
    }
  }

  private throwOtpRateLimited(): never {
    throw new HttpException(
      {
        code: 'OTP_RATE_LIMITED',
        message: 'Too many OTP requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async issueSessionTokens(userId: string, deviceId?: string): Promise<AuthTokenPair> {
    const pair = await this.tokens.issueTokenPair(userId);
    const refreshHash = this.tokens.hashRefreshToken(pair.refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiresInSeconds * 1000);
    await this.sessions.create({
      userId,
      deviceId: deviceId?.trim() || DEFAULT_DEVICE_ID,
      refreshToken: refreshHash,
      expiresAt,
    });
    return pair;
  }

  private async dispatchOtp(method: OtpMethod, contact: string, otp: string): Promise<void> {
    if (method === 'email') {
      await this.otpEmailProducer.enqueueSendOtp(contact, otp);
      return;
    }
    await this.smsSender.sendOtp(contact, otp);
  }

  private normalizeContact(contactRaw: string, method: OtpMethod): string {
    const trimmed = contactRaw.trim();
    if (method === 'email') {
      const email = trimmed.toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid contact format',
        });
      }
      return email;
    }

    const digits = trimmed.replace(/[^\d+]/g, '');
    const normalized = digits.startsWith('+') ? digits : `+${digits.replace(/^\+/, '')}`;
    const e164 = normalized.replace(/[^\d+]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid contact format',
      });
    }
    return e164;
  }

  private maskContact(contact: string, method: OtpMethod): string {
    if (method === 'email') {
      const [local, domain] = contact.split('@');
      if (!local || !domain) {
        return '***';
      }
      const visible = local.slice(0, 1);
      return `${visible}***@${domain}`;
    }
    if (contact.length < 6) {
      return '***';
    }
    return `${contact.slice(0, 3)}***${contact.slice(-2)}`;
  }

  private generateOtp(): string {
    if (this.config.get<string>('nodeEnv') === 'test' && this.otpTestCode) {
      return this.otpTestCode;
    }
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }
}
