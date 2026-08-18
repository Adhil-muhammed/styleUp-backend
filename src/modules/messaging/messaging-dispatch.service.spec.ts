import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MessagingDispatchService } from './messaging-dispatch.service';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';
import { MessagingDispatchProducerService } from '@/modules/messaging/messaging-dispatch-producer.service';

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('MessagingDispatchService', () => {
  let service: MessagingDispatchService;
  let messageLogs: Mocked<MessageLogRepositoryPort>;
  let producer: Mocked<Pick<MessagingDispatchProducerService, 'enqueue'>>;

  const input = {
    shopId: 'shop-1',
    bookingId: 'booking-1',
    recipient: '+919876543210',
    variables: { '1': 'Adhil', '2': 'Style Salon', '3': '18 Aug 2026', '4': 'pay_abc' },
  };

  beforeEach(async () => {
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
        MessagingDispatchService,
        { provide: MESSAGE_LOG_REPOSITORY, useValue: messageLogs },
        { provide: MessagingDispatchProducerService, useValue: producer },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'messaging.whatsappProvider') return 'console';
              if (key === 'msg91.templates') {
                return {
                  bookingConfirmation: 'booking_confirmation_tpl',
                  bookingReminder: 'booking_reminder_tpl',
                  bookingCancellation: 'booking_cancellation_tpl',
                };
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(MessagingDispatchService);
  });

  it('queues booking confirmation with hydrated input', async () => {
    messageLogs.createQueued.mockResolvedValue({
      id: 'log-1',
      shopId: input.shopId,
      recipient: input.recipient,
      channel: 'whatsapp',
      templateName: 'booking_confirmation_tpl',
      variables: input.variables,
      status: 'queued',
      providerMessageId: null,
      failureReason: null,
      provider: 'console',
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
    });

    const result = await service.sendBookingConfirmation(input);

    expect(result).toEqual({ logId: 'log-1' });
    expect(messageLogs.createQueued).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-1',
        recipient: '+919876543210',
        templateName: 'booking_confirmation_tpl',
        variables: input.variables,
      }),
    );
    expect(producer.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        logId: 'log-1',
        templateType: 'booking_confirmation',
      }),
    );
  });
});
