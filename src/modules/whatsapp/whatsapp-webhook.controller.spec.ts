import { createHmac } from 'crypto';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyWhatsappSignature } from '@/infra/meta/whatsapp-signature.util';
import { WhatsappSignatureGuard } from '@/modules/whatsapp/guards/whatsapp-signature.guard';
import { WhatsappWebhookController } from '@/modules/whatsapp/whatsapp-webhook.controller';
import { WhatsappWebhookService } from '@/modules/whatsapp/whatsapp-webhook.service';

const APP_SECRET = 'test_whatsapp_app_secret';
const VERIFY_TOKEN = 'test_verify_token';

function mockConfig(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'whatsapp.appSecret') return APP_SECRET;
      if (key === 'whatsapp.verifyToken') return VERIFY_TOKEN;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function mockExecutionContext(rawBody: Buffer, signature?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        rawBody,
        headers: { 'x-hub-signature-256': signature },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('WhatsappWebhookController', () => {
  let controller: WhatsappWebhookController;
  let service: jest.Mocked<Pick<WhatsappWebhookService, 'verifySubscription' | 'acceptWebhook'>>;

  beforeEach(() => {
    service = {
      verifySubscription: jest.fn(),
      acceptWebhook: jest.fn(),
    };
    controller = new WhatsappWebhookController(service as unknown as WhatsappWebhookService);
  });

  it('returns hub.challenge on GET verification', () => {
    service.verifySubscription.mockReturnValue('challenge-123');

    const result = controller.verifySubscription('subscribe', VERIFY_TOKEN, 'challenge-123');

    expect(result).toBe('challenge-123');
    expect(service.verifySubscription).toHaveBeenCalledWith(
      'subscribe',
      VERIFY_TOKEN,
      'challenge-123',
    );
  });

  it('accepts POST webhook and returns success immediately', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: '123', changes: [] }],
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    service.acceptWebhook.mockResolvedValue(undefined);

    const result = await controller.handleWebhook({ rawBody } as never);

    expect(result).toEqual({ success: true });
    expect(service.acceptWebhook).toHaveBeenCalledWith(payload);
  });
});

describe('WhatsappWebhookService verifySubscription', () => {
  let service: WhatsappWebhookService;
  let producer: { enqueuePayload: jest.Mock };

  beforeEach(() => {
    producer = { enqueuePayload: jest.fn() };
    service = new WhatsappWebhookService(mockConfig(), producer as never);
  });

  it('rejects invalid verify token', () => {
    expect(() => service.verifySubscription('subscribe', 'wrong', 'abc')).toThrow(
      ForbiddenException,
    );
  });

  it('returns challenge when token matches', () => {
    expect(service.verifySubscription('subscribe', VERIFY_TOKEN, 'abc')).toBe('abc');
  });
});

describe('WhatsappSignatureGuard', () => {
  let guard: WhatsappSignatureGuard;

  beforeEach(() => {
    guard = new WhatsappSignatureGuard(mockConfig());
  });

  it('rejects missing signature', () => {
    const ctx = mockExecutionContext(Buffer.from('{}'));
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('accepts valid X-Hub-Signature-256', () => {
    const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
    const digest = createHmac('sha256', APP_SECRET).update(body).digest('hex');
    const ctx = mockExecutionContext(body, `sha256=${digest}`);

    expect(guard.canActivate(ctx)).toBe(true);
  });
});

describe('verifyWhatsappSignature', () => {
  it('returns true for valid HMAC with sha256= prefix', () => {
    const body = Buffer.from('{"test":true}');
    const digest = createHmac('sha256', APP_SECRET).update(body).digest('hex');

    expect(verifyWhatsappSignature(body, `sha256=${digest}`, APP_SECRET)).toBe(true);
  });

  it('returns false when prefix is missing', () => {
    const body = Buffer.from('{"test":true}');
    const digest = createHmac('sha256', APP_SECRET).update(body).digest('hex');

    expect(verifyWhatsappSignature(body, digest, APP_SECRET)).toBe(false);
  });
});
