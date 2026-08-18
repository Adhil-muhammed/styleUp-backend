import { MessagingDispatchProcessor } from './messaging-dispatch.processor';
import { MessageLogRepositoryPort } from '@/modules/messaging/ports/message-log.repository.port';
import { MessageSenderPort } from '@/modules/messaging/ports/message-sender.port';
import type { Job } from 'bullmq';
import type { MessagingDispatchJobData } from '@/modules/messaging/messaging.constants';

type Mocked<T> = { [K in keyof T]: jest.Mock };

function makeJob(data: MessagingDispatchJobData): Job<MessagingDispatchJobData> {
  return { data } as Job<MessagingDispatchJobData>;
}

describe('MessagingDispatchProcessor', () => {
  let processor: MessagingDispatchProcessor;
  let messageLogs: Mocked<MessageLogRepositoryPort>;
  let sender: Mocked<MessageSenderPort>;

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
    sender = { sendTemplate: jest.fn() };
    processor = new MessagingDispatchProcessor(messageLogs, sender);
  });

  it('skips when log is already sent', async () => {
    messageLogs.findById.mockResolvedValue({
      id: 'log-1',
      shopId: 'shop-1',
      recipient: '+919876543210',
      channel: 'whatsapp',
      templateName: 't1',
      variables: {},
      status: 'sent',
      providerMessageId: 'wamid.1',
      failureReason: null,
      provider: 'msg91',
      createdAt: new Date(),
      sentAt: new Date(),
      deliveredAt: null,
      readAt: null,
    });

    await processor.process(
      makeJob({
        logId: 'log-1',
        shopId: 'shop-1',
        channel: 'whatsapp',
        recipient: '+919876543210',
        templateName: 't1',
        variables: {},
      }),
    );

    expect(sender.sendTemplate).not.toHaveBeenCalled();
  });

  it('sends template and marks log sent on success', async () => {
    messageLogs.findById.mockResolvedValue({
      id: 'log-1',
      shopId: 'shop-1',
      recipient: '+919876543210',
      channel: 'whatsapp',
      templateName: 't1',
      variables: {},
      status: 'queued',
      providerMessageId: null,
      failureReason: null,
      provider: 'msg91',
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
    });
    sender.sendTemplate.mockResolvedValue({ providerMessageId: 'wamid.new' });

    await processor.process(
      makeJob({
        logId: 'log-1',
        shopId: 'shop-1',
        channel: 'whatsapp',
        recipient: '+919876543210',
        templateName: 't1',
        variables: {},
      }),
    );

    expect(sender.sendTemplate).toHaveBeenCalled();
    expect(messageLogs.markSent).toHaveBeenCalledWith('log-1', 'wamid.new', expect.any(Date));
  });

  it('marks log failed and rethrows on send error', async () => {
    messageLogs.findById.mockResolvedValue({
      id: 'log-1',
      shopId: 'shop-1',
      recipient: '+919876543210',
      channel: 'whatsapp',
      templateName: 't1',
      variables: {},
      status: 'queued',
      providerMessageId: null,
      failureReason: null,
      provider: 'msg91',
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
    });
    sender.sendTemplate.mockRejectedValue(new Error('MSG91 API down'));

    await expect(
      processor.process(
        makeJob({
          logId: 'log-1',
          shopId: 'shop-1',
          channel: 'whatsapp',
          recipient: '+919876543210',
          templateName: 't1',
          variables: {},
        }),
      ),
    ).rejects.toThrow('MSG91 API down');

    expect(messageLogs.markFailed).toHaveBeenCalledWith('log-1', 'MSG91 API down');
  });
});
