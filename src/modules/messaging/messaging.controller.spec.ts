import { MessagingController } from './messaging.controller';
import type { MessagingService } from './messaging.service';

describe('MessagingController', () => {
  const mockService = {
    sendTemplate: jest.fn(),
  };

  const controller = () => new MessagingController(mockService as unknown as MessagingService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendTemplate wraps service result in success envelope', async () => {
    mockService.sendTemplate.mockResolvedValue({ logId: 'log-1', status: 'queued' });

    const result = await controller().sendTemplate('shop-1', {
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_confirmation',
    });

    expect(mockService.sendTemplate).toHaveBeenCalledWith('shop-1', {
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_confirmation',
    });
    expect(result).toEqual({
      success: true,
      data: { logId: 'log-1', status: 'queued' },
    });
  });
});
