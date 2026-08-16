/**
 * Strict TypeScript models for Meta WhatsApp Business Cloud API webhook payloads.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */

export type WhatsappWebhookObject = 'whatsapp_business_account';

export type WhatsappChangeField = 'messages' | 'message_template_status_update' | string;

export interface WhatsappWebhookPayload {
  object: WhatsappWebhookObject;
  entry: WhatsappWebhookEntry[];
}

export interface WhatsappWebhookEntry {
  id: string;
  changes: WhatsappWebhookChange[];
}

export interface WhatsappWebhookChange {
  field: WhatsappChangeField;
  value: WhatsappMessagesChangeValue | WhatsappTemplateStatusChangeValue;
}

/** `field === 'messages'` — inbound customer messages + delivery/read statuses. */
export interface WhatsappMessagesChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsappMetadata;
  contacts?: WhatsappContact[];
  messages?: WhatsappInboundMessage[];
  statuses?: WhatsappMessageStatus[];
  errors?: WhatsappWebhookError[];
}

export interface WhatsappMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsappContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsappWebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details: string };
}

export interface WhatsappInboundMessageBase {
  /** Globally unique WhatsApp message id — primary idempotency key for inbound events. */
  id: string;
  from: string;
  timestamp: string;
  type: WhatsappInboundMessageType;
  context?: { from: string; id: string };
}

export type WhatsappInboundMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'reaction'
  | 'unsupported'
  | 'system'
  | string;

export interface WhatsappTextMessage extends WhatsappInboundMessageBase {
  type: 'text';
  text: { body: string };
}

export interface WhatsappMediaMessage extends WhatsappInboundMessageBase {
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  image?: WhatsappMediaObject;
  audio?: WhatsappMediaObject;
  video?: WhatsappMediaObject;
  document?: WhatsappMediaObject & { filename?: string };
  sticker?: WhatsappMediaObject;
}

export interface WhatsappMediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export type WhatsappInboundMessage =
  WhatsappTextMessage | WhatsappMediaMessage | WhatsappInboundMessageBase;

export interface WhatsappMessageStatus {
  /** Status update id — use as idempotency key for delivery/read receipts. */
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | string;
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; origin: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: WhatsappWebhookError[];
}

/** `field === 'message_template_status_update'` — template review lifecycle. */
export interface WhatsappTemplateStatusChangeValue {
  event: string;
  message_template_id: number | string;
  message_template_name: string;
  message_template_language: string;
  reason?: string;
  disable_info?: { disable_date: string };
  other_info?: { title: string; description: string };
}

export function isWhatsappWebhookPayload(value: unknown): value is WhatsappWebhookPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record['object'] === 'whatsapp_business_account' && Array.isArray(record['entry']);
}

export function isMessagesChangeValue(
  value: WhatsappWebhookChange['value'],
): value is WhatsappMessagesChangeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as WhatsappMessagesChangeValue).messaging_product === 'whatsapp'
  );
}

export function isTemplateStatusChangeValue(
  value: WhatsappWebhookChange['value'],
): value is WhatsappTemplateStatusChangeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message_template_id' in value &&
    'message_template_name' in value &&
    'event' in value
  );
}
