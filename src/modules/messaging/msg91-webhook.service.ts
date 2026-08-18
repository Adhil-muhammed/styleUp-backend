import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractProviderMessageId(payload: Record<string, unknown>): string | undefined {
  return (
    readString(payload, 'message_uuid') ??
    readString(payload, 'request_id') ??
    readString(payload, 'messageUuid') ??
    readString(payload, 'requestId')
  );
}

function extractStatus(payload: Record<string, unknown>): string | undefined {
  const raw =
    readString(payload, 'eventName') ??
    readString(payload, 'status') ??
    readString(payload, 'event_name');
  return raw?.toLowerCase();
}

@Injectable()
export class Msg91WebhookService {
  private readonly logger = new Logger(Msg91WebhookService.name);

  constructor(
    @Inject(MESSAGE_LOG_REPOSITORY) private readonly messageLogs: MessageLogRepositoryPort,
  ) {}

  async handleDeliveryStatus(payload: unknown): Promise<boolean> {
    if (!isRecord(payload)) {
      this.logger.warn('MSG91 webhook ignored: payload is not an object');
      return false;
    }

    const providerMessageId = extractProviderMessageId(payload);
    const status = extractStatus(payload);

    if (!providerMessageId || !status) {
      this.logger.warn('MSG91 webhook ignored: missing message id or status');
      return false;
    }

    const log = await this.messageLogs.findByProviderMessageId(providerMessageId);
    if (!log) {
      this.logger.warn(`MSG91 webhook: no log for provider id ${providerMessageId}`);
      return false;
    }

    const now = new Date();

    if (status === 'delivered') {
      const updated = await this.messageLogs.markDelivered(log.id, now);
      if (updated) {
        this.logger.log(`Message log ${log.id} marked delivered`);
      }
      return updated;
    }

    if (status === 'read') {
      const updated = await this.messageLogs.markRead(log.id, now);
      if (updated) {
        this.logger.log(`Message log ${log.id} marked read`);
      }
      return updated;
    }

    if (status === 'failed') {
      const reason =
        readString(payload, 'failure_reason') ?? readString(payload, 'reason') ?? 'Delivery failed';
      const updated = await this.messageLogs.markFailedFromWebhook(log.id, reason);
      if (updated) {
        this.logger.log(`Message log ${log.id} marked failed from webhook`);
      }
      return updated;
    }

    this.logger.debug(`MSG91 webhook ignored unhandled status: ${status}`);
    return false;
  }
}
