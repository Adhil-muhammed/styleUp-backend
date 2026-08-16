import { WhatsappWebhookPayload } from '@/modules/whatsapp/dto/whatsapp-webhook-payload.types';

export const WHATSAPP_WEBHOOK_QUEUE = 'whatsapp-webhook';

/** Meta may retry webhook delivery for up to 24 hours. */
export const WHATSAPP_IDEMPOTENCY_TTL_SECONDS = 86_400;

export interface WhatsappWebhookJobData {
  /** ISO timestamp when the webhook was accepted — useful for lag observability. */
  receivedAt: string;
  payload: WhatsappWebhookPayload;
}
