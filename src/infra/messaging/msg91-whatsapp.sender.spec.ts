import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, UnsupportedMediaTypeException } from '@nestjs/common';
import { Msg91WhatsappSender } from './msg91-whatsapp.sender';

describe('Msg91WhatsappSender', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function createSender(overrides: Record<string, string | undefined> = {}): Msg91WhatsappSender {
    const values: Record<string, string> = {
      'msg91.authKey': 'test-auth-key',
      'msg91.integratedNumber': '9199999999999',
      'msg91.namespace': 'test_namespace',
      'msg91.apiBaseUrl': 'https://control.msg91.com',
      ...overrides,
    };

    const config = {
      get: jest.fn((key: string) => values[key]),
      getOrThrow: jest.fn((key: string) => {
        const result = values[key];
        if (!result) {
          throw new Error(`Missing config: ${key}`);
        }
        return result;
      }),
    } as unknown as ConfigService;

    return new Msg91WhatsappSender(config);
  }

  it('rejects non-whatsapp channel', async () => {
    const sender = createSender();

    await expect(
      sender.sendTemplate({
        channel: 'sms',
        recipient: '+919876543210',
        templateName: 'booking_confirmation',
        variables: {},
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('POSTs bulk template payload with authkey header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message_uuid: 'msg-uuid-1' }),
    });

    const sender = createSender();
    const result = await sender.sendTemplate({
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_confirmation',
      variables: { '1': 'Adhil', '2': 'Style Salon' },
    });

    expect(result).toEqual({ providerMessageId: 'msg-uuid-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authkey: 'test-auth-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      integrated_number: string;
      payload: {
        template: {
          namespace: string;
          name: string;
          to_and_components: Array<{ to: string[]; components: Record<string, unknown> }>;
        };
      };
    };

    expect(body.integrated_number).toBe('9199999999999');
    expect(body.payload.template.namespace).toBe('test_namespace');
    expect(body.payload.template.name).toBe('booking_confirmation');
    expect(body.payload.template.to_and_components[0]?.to).toEqual(['919876543210']);
    expect(body.payload.template.to_and_components[0]?.components).toEqual({
      body_1: { type: 'text', value: 'Adhil' },
      body_2: { type: 'text', value: 'Style Salon' },
    });
  });

  it('throws MESSAGE_SEND_FAILED on HTTP error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid template' }),
    });

    const sender = createSender();

    await expect(
      sender.sendTemplate({
        channel: 'whatsapp',
        recipient: '+919876543210',
        templateName: 'booking_confirmation',
        variables: {},
      }),
    ).rejects.toMatchObject({
      response: { code: 'MESSAGE_SEND_FAILED', message: 'Invalid template' },
    });
  });

  it('uses request_id when message_uuid absent', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ request_id: 'req-123' }),
    });

    const sender = createSender();
    const result = await sender.sendTemplate({
      channel: 'whatsapp',
      recipient: '+919876543210',
      templateName: 'booking_reminder',
      variables: {},
    });

    expect(result).toEqual({ providerMessageId: 'req-123' });
  });

  it('throws when response has no message id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const sender = createSender();

    await expect(
      sender.sendTemplate({
        channel: 'whatsapp',
        recipient: '+919876543210',
        templateName: 'booking_confirmation',
        variables: {},
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
