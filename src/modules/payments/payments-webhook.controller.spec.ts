import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsWebhookController } from '@/modules/payments/payments-webhook.controller';
import { PaymentsService } from '@/modules/payments/payments.service';
import { verifyRazorpaySignature } from '@/infra/razorpay/razorpay-signature.util';

const mockPaymentsService = {
  handleWebhookEvent: jest.fn(),
};

const WEBHOOK_SECRET = 'test_webhook_secret';

function mockConfig(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'razorpay.webhookSecret') return WEBHOOK_SECRET;
      return undefined;
    }),
  } as unknown as ConfigService;
}

describe('PaymentsWebhookController', () => {
  let controller: PaymentsWebhookController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentsWebhookController(
      mockPaymentsService as unknown as PaymentsService,
      mockConfig(),
    );
  });

  it('rejects invalid signature', async () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

    await expect(
      controller.handleRazorpayWebhook({ rawBody: body } as never, 'bad-signature', 'evt_1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('delegates valid webhook to service', async () => {
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
    };
    const body = Buffer.from(JSON.stringify(payload));
    const signature = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    mockPaymentsService.handleWebhookEvent.mockResolvedValue({ duplicate: false });

    const result = await controller.handleRazorpayWebhook(
      { rawBody: body } as never,
      signature,
      'evt_1',
    );

    expect(result.success).toBe(true);
    expect(mockPaymentsService.handleWebhookEvent).toHaveBeenCalledWith('evt_1', payload);
  });
});

describe('verifyRazorpaySignature', () => {
  it('returns true for valid HMAC', () => {
    const body = Buffer.from('{"test":true}');
    const sig = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

    expect(verifyRazorpaySignature(body, sig, WEBHOOK_SECRET)).toBe(true);
  });
});
