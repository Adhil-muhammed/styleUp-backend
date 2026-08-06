export const WEBHOOK_EVENT_REPOSITORY = Symbol('WEBHOOK_EVENT_REPOSITORY');

export interface RecordWebhookEventInput {
  gatewayEventId: string;
  eventType: string;
  gatewayPaymentId: string | null;
  gatewayOrderId: string | null;
  payload: Record<string, unknown>;
}

export interface WebhookEventRepositoryPort {
  /**
   * Attempts to record a webhook event. Returns false when the event id was
   * already processed (duplicate delivery).
   */
  tryRecordEvent(input: RecordWebhookEventInput): Promise<boolean>;
}
