import { BadRequestException } from '@nestjs/common';
import {
  isWhatsappWebhookPayload,
  WhatsappWebhookPayload,
} from '@/modules/whatsapp/dto/whatsapp-webhook-payload.types';

/**
 * Validates and narrows an untyped Express body to {@link WhatsappWebhookPayload}.
 * Keeps validation separate from the controller so POST can ack Meta immediately.
 */
export function parseWhatsappWebhookPayload(body: unknown): WhatsappWebhookPayload {
  if (!isWhatsappWebhookPayload(body)) {
    throw new BadRequestException({
      code: 'WEBHOOK_PAYLOAD_INVALID',
      message: 'Malformed WhatsApp webhook payload',
    });
  }

  if (body.entry.length === 0) {
    throw new BadRequestException({
      code: 'WEBHOOK_PAYLOAD_EMPTY',
      message: 'WhatsApp webhook entry array is empty',
    });
  }

  return body;
}
