import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';
import { SHOP_LOOKUP, ShopLookupPort } from '@/modules/messaging/ports/shop-lookup.port';
import { MessagingDispatchProducerService } from '@/modules/messaging/messaging-dispatch-producer.service';

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('MessagingService', () => {
  let service: MessagingService;
  let shops: Mocked<ShopLookupPort>;
  let messageLogs: Mocked<MessageLogRepositoryPort>;
  let producer: Mocked<Pick<MessagingDispatchProducerService, 'enqueue'>>;

  beforeEach(async () => {
    shops = { existsById: jest.fn() };
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
    producer = { enqueue: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: SHOP_LOOKUP, useValue: shops },
        { provide: MESSAGE_LOG_REPOSITORY, useValue: messageLogs },
        { provide: MessagingDispatchProducerService, useValue: producer },
      ],
    }).compile();

    service = module.get(MessagingService);
  });

  it('creates log and enqueues job when shop exists', async () => {
    shops.existsById.mockResolvedValue(true);
    messageLogs.createQueued.mockResolvedValue({
      id: 'log-1',
      shopId: 'shop-1',
      recipient: '+919876543210',
      channel: 'whatsapp',
      templateName: 'booking_confirmation',
      variables: { '1': 'Adhil' },
      status: 'queued',
      providerMessageId: null,
      failureReason: null,
      provider: 'msg91',
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
    });

    const result = await service.sendTemplate('shop-1', {
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_confirmation',
      variables: { '1': 'Adhil' },
    });

    expect(result).toEqual({ logId: 'log-1', status: 'queued' });
    expect(producer.enqueue).toHaveBeenCalledWith({
      logId: 'log-1',
      shopId: 'shop-1',
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_confirmation',
      variables: { '1': 'Adhil' },
    });
  });

  it('throws SHOP_NOT_FOUND when shop does not exist', async () => {
    shops.existsById.mockResolvedValue(false);

    await expect(
      service.sendTemplate('missing-shop', {
        channel: 'sms',
        recipient: '+919876543210',
        templateName: 'test_template',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
