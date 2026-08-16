import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parseWhatsappWebhookPayload,
  WhatsappInboundMessage,
  WhatsappMessageStatus,
  WhatsappTemplateStatusChangeValue,
} from '@/modules/whatsapp/dto';
import { WhatsappWebhookProducerService } from '@/modules/whatsapp/whatsapp-webhook-producer.service';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly producer: WhatsappWebhookProducerService,
  ) {}

  /**
   * Meta GET verification handshake.
   * Returns `hub.challenge` as plain text — Meta rejects JSON-wrapped responses.
   */
  verifySubscription(hubMode: string, verifyToken: string, challenge: string): string {
    const expectedToken = this.config.get<string>('whatsapp.verifyToken');

    if (!expectedToken) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_NOT_CONFIGURED',
        message: 'WhatsApp verify token is not configured',
      });
    }

    if (hubMode !== 'subscribe') {
      throw new ForbiddenException({
        code: 'WEBHOOK_VERIFICATION_FAILED',
        message: 'Invalid hub.mode — expected subscribe',
      });
    }

    if (verifyToken !== expectedToken) {
      throw new ForbiddenException({
        code: 'WEBHOOK_VERIFICATION_FAILED',
        message: 'Invalid hub.verify_token',
      });
    }

    return challenge;
  }

  /**
   * Validates payload shape, enqueues for async processing, and returns immediately.
   * Called by the controller — must stay fast (no SMTP, DB, or external API calls).
   */
  async acceptWebhook(body: unknown): Promise<void> {
    const payload = parseWhatsappWebhookPayload(body);
    await this.producer.enqueuePayload(payload);
  }

  async handleInboundMessage(
    message: WhatsappInboundMessage,
    phoneNumberId: string,
  ): Promise<void> {
    if (message.type === 'text' && 'text' in message) {
      this.logger.log(
        `Inbound text from ${message.from} (phone_number_id=${phoneNumberId}): ${message.text.body}`,
      );
      return;
    }

    if (
      message.type === 'image' ||
      message.type === 'audio' ||
      message.type === 'video' ||
      message.type === 'document' ||
      message.type === 'sticker'
    ) {
      this.logger.log(
        `Inbound ${message.type} from ${message.from} (wamid=${message.id}, phone_number_id=${phoneNumberId})`,
      );
      return;
    }

    this.logger.log(
      `Inbound ${message.type} from ${message.from} (wamid=${message.id}) — handler not implemented`,
    );
  }

  async handleMessageStatus(status: WhatsappMessageStatus): Promise<void> {
    this.logger.log(
      `Message status ${status.status} for recipient ${status.recipient_id} (status_id=${status.id})`,
    );
  }

  async handleTemplateStatusUpdate(value: WhatsappTemplateStatusChangeValue): Promise<void> {
    this.logger.log(
      `Template "${value.message_template_name}" (${value.message_template_language}) → ${value.event}${
        value.reason ? ` (${value.reason})` : ''
      }`,
    );
  }
}
