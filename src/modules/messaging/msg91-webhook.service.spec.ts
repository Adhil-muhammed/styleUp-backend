import { Msg91WebhookService } from './msg91-webhook.service';
import { MessageLogRepositoryPort } from '@/modules/messaging/ports/message-log.repository.port';

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('Msg91WebhookService', () => {
  let service: Msg91WebhookService;
  let messageLogs: Mocked<MessageLogRepositoryPort>;

  const baseLog = {
    id: 'log-1',
    shopId: 'shop-1',
    recipient: '+919876543210',
    channel: 'whatsapp' as const,
    templateName: 'booking_confirmation',
    variables: {},
    status: 'sent' as const,
    providerMessageId: 'msg-uuid-1',
    failureReason: null,
    provider: 'msg91',
    createdAt: new Date(),
    sentAt: new Date(),
    deliveredAt: null,
    readAt: null,
  };

  beforeEach(() => {
    messageLogs = {
      createQueued: jest.fn(),
      findById: jest.fn(),
      findByProviderMessageId: jest.fn(),
      markSent: jest.fn(),
      markDelivered: jest.fn(),
      markRead: jest.fn(),
      markFailed: jest.fn(),
      markFailedFromWebhook: jest.fn(),
    };
    service = new Msg91WebhookService(messageLogs);
  });

  it('marks log delivered when webhook status is delivered', async () => {
    messageLogs.findByProviderMessageId.mockResolvedValue(baseLog);
    messageLogs.markDelivered.mockResolvedValue(true);

    const updated = await service.handleDeliveryStatus({
      message_uuid: 'msg-uuid-1',
      eventName: 'delivered',
    });

    expect(updated).toBe(true);
    expect(messageLogs.markDelivered).toHaveBeenCalledWith('log-1', expect.any(Date));
  });

  it('marks log read when webhook status is read', async () => {
    messageLogs.findByProviderMessageId.mockResolvedValue({
      ...baseLog,
      status: 'delivered',
      deliveredAt: new Date(),
    });
    messageLogs.markRead.mockResolvedValue(true);

    const updated = await service.handleDeliveryStatus({
      request_id: 'msg-uuid-1',
      status: 'read',
    });

    expect(updated).toBe(true);
    expect(messageLogs.markRead).toHaveBeenCalledWith('log-1', expect.any(Date));
  });

  it('returns false when log not found', async () => {
    messageLogs.findByProviderMessageId.mockResolvedValue(null);

    const updated = await service.handleDeliveryStatus({
      message_uuid: 'unknown',
      eventName: 'delivered',
    });

    expect(updated).toBe(false);
  });
});
