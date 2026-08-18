import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Msg91WebhookController } from './msg91-webhook.controller';
import { Msg91WebhookService } from './msg91-webhook.service';

describe('Msg91WebhookController', () => {
  let controller: Msg91WebhookController;
  let webhookService: jest.Mocked<Pick<Msg91WebhookService, 'handleDeliveryStatus'>>;
  let config: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    webhookService = { handleDeliveryStatus: jest.fn().mockResolvedValue(true) };
    config = { get: jest.fn() };
    controller = new Msg91WebhookController(
      webhookService as unknown as Msg91WebhookService,
      config as unknown as ConfigService,
    );
  });

  it('returns received true immediately without awaiting service', () => {
    config.get.mockReturnValue('secret-123');

    const result = controller.handleWhatsappDelivery('secret-123', {
      message_uuid: 'msg-1',
      eventName: 'delivered',
    });

    expect(result).toEqual({ success: true, data: { received: true } });
    expect(webhookService.handleDeliveryStatus).toHaveBeenCalled();
  });

  it('rejects invalid webhook secret when configured', () => {
    config.get.mockReturnValue('secret-123');

    expect(() =>
      controller.handleWhatsappDelivery('wrong', { message_uuid: 'msg-1', eventName: 'delivered' }),
    ).toThrow(UnauthorizedException);
  });
});
