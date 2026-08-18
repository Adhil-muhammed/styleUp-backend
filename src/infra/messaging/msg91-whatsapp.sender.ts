import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toMsg91Components } from '@/infra/messaging/msg91-template-variables';
import { sanitizePhoneForMsg91 } from '@/infra/messaging/sanitize-phone-for-msg91';
import {
  MessageSenderPort,
  SendTemplateMessageInput,
  SendTemplateMessageResult,
} from '@/modules/messaging/ports/message-sender.port';

interface Msg91BulkResponse {
  message_uuid?: string;
  request_id?: string;
  type?: string;
  message?: string;
  errors?: Array<{ message: string }>;
}

@Injectable()
export class Msg91WhatsappSender implements MessageSenderPort {
  private readonly logger = new Logger(Msg91WhatsappSender.name);

  constructor(private readonly config: ConfigService) {}

  async sendTemplate(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult> {
    if (input.channel !== 'whatsapp') {
      throw new UnsupportedMediaTypeException({
        code: 'CHANNEL_NOT_SUPPORTED',
        message: 'MSG91 WhatsApp sender only supports whatsapp channel',
      });
    }

    const authKey = this.config.getOrThrow<string>('msg91.authKey');
    const integratedNumber = this.config.getOrThrow<string>('msg91.integratedNumber');
    const namespace = this.config.getOrThrow<string>('msg91.namespace');
    const apiBaseUrl = this.config.get<string>('msg91.apiBaseUrl') ?? 'https://control.msg91.com';

    const to = sanitizePhoneForMsg91(input.recipient);
    const components = toMsg91Components(input.variables);

    const body = {
      integrated_number: integratedNumber,
      content_type: 'template',
      payload: {
        template: {
          namespace,
          name: input.templateName,
          language: { code: 'en', policy: 'deterministic' },
          to_and_components: [{ to: [to], components }],
        },
      },
    };

    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v5/whatsapp/whatsapp-outbound-message/bulk/`;

    this.logger.log(
      `MSG91 WhatsApp template "${input.templateName}" → ${this.maskRecipient(input.recipient)}`,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as Msg91BulkResponse;

      if (!response.ok) {
        const message =
          payload.message ?? payload.errors?.[0]?.message ?? `MSG91 API HTTP ${response.status}`;
        this.logger.error(`MSG91 WhatsApp send failed: ${message}`);
        throw new InternalServerErrorException({
          code: 'MESSAGE_SEND_FAILED',
          message,
        });
      }

      const providerMessageId = payload.message_uuid ?? payload.request_id;
      if (!providerMessageId) {
        throw new InternalServerErrorException({
          code: 'MESSAGE_SEND_FAILED',
          message: 'MSG91 API returned no message id',
        });
      }

      return { providerMessageId };
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown MSG91 API error';
      this.logger.error(`MSG91 WhatsApp send error: ${message}`);
      throw new InternalServerErrorException({
        code: 'MESSAGE_SEND_FAILED',
        message,
      });
    }
  }

  private maskRecipient(recipient: string): string {
    const digits = recipient.replace(/\D/g, '');
    if (digits.length <= 4) {
      return '****';
    }
    return `****${digits.slice(-4)}`;
  }
}
