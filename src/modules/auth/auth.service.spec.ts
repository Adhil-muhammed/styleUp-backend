import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  EMAIL_SENDER,
  OTP_STORE,
  SESSION_REPOSITORY,
  SMS_SENDER,
  SOCIAL_TOKEN_VERIFIER,
  TOKEN_SERVICE,
  USER_REPOSITORY,
  UserRepositoryPort,
  SessionRepositoryPort,
  OtpStorePort,
  TokenServicePort,
  SmsSenderPort,
  EmailSenderPort,
  SocialTokenVerifierPort,
} from '@/modules/auth/ports';
import { UniqueContactConflictError } from '@/modules/auth/domain/unique-contact-conflict.error';
import {
  createOtpSession,
  createTokenPair,
  createUser,
  createUserSession,
} from '../../../test/factories/auth-test-factories';

type Mocked<T> = { [K in keyof T]: jest.Mock };

function createConfigService(): ConfigService {
  const values: Record<string, unknown> = {
    nodeEnv: 'test',
    'auth.otpTtlSeconds': 300,
    'auth.otpRateMax': 3,
    'auth.otpRateWindowSeconds': 60,
    'auth.otpMaxVerifyAttempts': 5,
    'auth.otpIpRateMax': 20,
    'auth.otpIpRateWindowSeconds': 3600,
    'auth.otpSmsIpRateMax': 10,
    'auth.otpSmsIpRateWindowSeconds': 3600,
    'auth.otpDeviceRateMax': 20,
    'auth.otpDeviceRateWindowSeconds': 3600,
    'auth.otpTestCode': '123456',
    'jwt.refreshExpiresInSeconds': 604800,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('AuthService', () => {
  let service: AuthService;
  let users: Mocked<UserRepositoryPort>;
  let sessions: Mocked<SessionRepositoryPort>;
  let otpStore: Mocked<OtpStorePort>;
  let tokens: Mocked<TokenServicePort>;
  let smsSender: Mocked<SmsSenderPort>;
  let emailSender: Mocked<EmailSenderPort>;
  let socialVerifier: Mocked<SocialTokenVerifierPort>;

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findByIdentity: jest.fn(),
      createCustomerUser: jest.fn(),
      markEmailVerified: jest.fn(),
      markPhoneVerified: jest.fn(),
      linkIdentity: jest.fn(),
    };
    sessions = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      revoke: jest.fn(),
      revokeByRefreshToken: jest.fn(),
      revokeAllForUser: jest.fn(),
      deleteExpiredAndRevoked: jest.fn(),
    };
    otpStore = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      replaceOtp: jest.fn(),
      incrementAttempts: jest.fn(),
      deleteSession: jest.fn(),
      consumeRateLimit: jest.fn().mockResolvedValue(true),
    };
    tokens = {
      issueTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      hashRefreshToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      blockAccessToken: jest.fn(),
      isAccessTokenBlocked: jest.fn(),
    };
    smsSender = { sendOtp: jest.fn() };
    emailSender = { sendOtp: jest.fn() };
    socialVerifier = { verify: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: users },
        { provide: SESSION_REPOSITORY, useValue: sessions },
        { provide: OTP_STORE, useValue: otpStore },
        { provide: TOKEN_SERVICE, useValue: tokens },
        { provide: SMS_SENDER, useValue: smsSender },
        { provide: EMAIL_SENDER, useValue: emailSender },
        { provide: SOCIAL_TOKEN_VERIFIER, useValue: socialVerifier },
        { provide: ConfigService, useValue: createConfigService() },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('requestOtp sends OTP and returns session metadata', async () => {
    users.findByEmail.mockResolvedValue(createUser());
    otpStore.createSession.mockResolvedValue(createOtpSession());

    const result = await service.requestOtp({
      contact: 'USER@Example.com',
      method: 'email',
      clientIp: '127.0.0.1',
      deviceId: 'device-1',
    });

    expect(result.otpSessionId).toBe('otp-session-1');
    expect(result.expiresInSeconds).toBe(300);
    expect(emailSender.sendOtp).toHaveBeenCalledWith('user@example.com', '123456');
    expect(otpStore.consumeRateLimit).toHaveBeenCalledTimes(3);
  });

  it('requestOtp throws OTP_RATE_LIMITED when contact bucket is blocked', async () => {
    otpStore.consumeRateLimit.mockResolvedValueOnce(false);

    await expect(
      service.requestOtp({
        contact: 'user@example.com',
        method: 'email',
      }),
    ).rejects.toMatchObject({
      status: 429,
      response: { code: 'OTP_RATE_LIMITED' },
    });
  });

  it('verifyOtp creates new user when no account exists', async () => {
    const tokenPair = createTokenPair();
    const newUser = createUser({ id: 'user-2', email: 'new@example.com', displayName: 'New User' });

    otpStore.getSession.mockResolvedValue(
      createOtpSession({
        method: 'email',
        contact: 'new@example.com',
        otpHash: service['hashOtp']('123456'),
      }),
    );
    users.findByEmail.mockResolvedValueOnce(null);
    users.createCustomerUser.mockResolvedValue(newUser);
    tokens.issueTokenPair.mockResolvedValue(tokenPair);
    tokens.hashRefreshToken.mockReturnValue('hashed-refresh');
    sessions.create.mockResolvedValue(createUserSession({ userId: 'user-2' }));

    const result = await service.verifyOtp({
      otpSessionId: 'otp-session-1',
      action: 'verify',
      otp: '123456',
      displayName: 'New User',
      deviceId: 'device-1',
    });

    if (!('isNewUser' in result)) {
      throw new Error('Expected verify result');
    }
    expect(result.isNewUser).toBe(true);
    expect(result.user.id).toBe('user-2');
    expect(tokens.issueTokenPair).toHaveBeenCalledWith('user-2');
  });

  it('verifyOtp handles unique conflict race by reloading existing user', async () => {
    const racedUser = createUser({ id: 'user-3', email: 'raced@example.com' });

    otpStore.getSession.mockResolvedValue(
      createOtpSession({
        method: 'email',
        contact: 'raced@example.com',
        otpHash: service['hashOtp']('123456'),
      }),
    );
    users.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(racedUser);
    users.createCustomerUser.mockRejectedValue(new UniqueContactConflictError('raced@example.com'));
    tokens.issueTokenPair.mockResolvedValue(createTokenPair());
    tokens.hashRefreshToken.mockReturnValue('hashed-refresh');
    sessions.create.mockResolvedValue(createUserSession({ userId: 'user-3' }));

    const result = await service.verifyOtp({
      otpSessionId: 'otp-session-1',
      action: 'verify',
      otp: '123456',
      displayName: 'Raced User',
    });

    if (!('isNewUser' in result)) {
      throw new Error('Expected verify result');
    }
    expect(result.isNewUser).toBe(false);
    expect(users.markEmailVerified).toHaveBeenCalledWith('user-3', expect.any(Date));
  });

  it('refresh rotates session for active user', async () => {
    const current = createUserSession({ userId: 'user-4' });
    sessions.findByRefreshToken.mockResolvedValue(current);
    users.findById.mockResolvedValue(createUser({ id: 'user-4' }));
    tokens.hashRefreshToken.mockReturnValue('hashed-refresh');
    tokens.issueTokenPair.mockResolvedValue(createTokenPair({ refreshToken: 'new-refresh' }));
    sessions.create.mockResolvedValue(createUserSession({ userId: 'user-4' }));

    const result = await service.refresh('refresh-token', 'device-9');

    expect(sessions.revoke).toHaveBeenCalledWith(current.id);
    expect(result.tokens.refreshToken).toBe('new-refresh');
  });

  it('logout revokes refresh token and blocks access token', async () => {
    tokens.hashRefreshToken.mockReturnValue('hashed-refresh');

    const result = await service.logout({
      userId: 'user-1',
      accessJti: 'jti-1',
      accessExp: 1234,
      refreshToken: 'refresh-token',
    });

    expect(result.success).toBe(true);
    expect(sessions.revokeByRefreshToken).toHaveBeenCalledWith('hashed-refresh');
    expect(tokens.blockAccessToken).toHaveBeenCalledWith('jti-1', 1234);
  });

  it('verifyOtp rejects invalid otp and increments attempts', async () => {
    otpStore.getSession.mockResolvedValue(createOtpSession({ otpHash: 'expected-hash' }));
    otpStore.incrementAttempts.mockResolvedValue(1);

    await expect(
      service.verifyOtp({
        otpSessionId: 'otp-session-1',
        action: 'verify',
        otp: '000000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(otpStore.incrementAttempts).toHaveBeenCalledWith('otp-session-1');
  });

  it('refresh rejects expired session', async () => {
    sessions.findByRefreshToken.mockResolvedValue(
      createUserSession({ expiresAt: new Date(Date.now() - 1_000) }),
    );
    tokens.hashRefreshToken.mockReturnValue('hashed-refresh');

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requestOtp normalizes invalid contact with validation error', async () => {
    await expect(
      service.requestOtp({
        contact: 'not-an-email',
        method: 'email',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requestOtp throws if sms rate bucket blocks by IP', async () => {
    otpStore.consumeRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      service.requestOtp({
        contact: '+919999999999',
        method: 'sms',
        clientIp: '10.0.0.1',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
