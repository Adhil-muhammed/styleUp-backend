import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  isMessagesChangeValue,
  isTemplateStatusChangeValue,
  WhatsappInboundMessage,
  WhatsappMessagesChangeValue,
  WhatsappMessageStatus,
  WhatsappTemplateStatusChangeValue,
} from '@/modules/whatsapp/dto';
import {
  WHATSAPP_IDEMPOTENCY_STORE,
  WhatsappIdempotencyStorePort,
} from '@/modules/whatsapp/ports/whatsapp-idempotency.port';
import {
  WHATSAPP_IDEMPOTENCY_TTL_SECONDS,
  WHATSAPP_WEBHOOK_QUEUE,
  WhatsappWebhookJobData,
} from '@/modules/whatsapp/whatsapp.constants';
import { WhatsappWebhookService } from '@/modules/whatsapp/whatsapp-webhook.service';

@Processor(WHATSAPP_WEBHOOK_QUEUE)
export class WhatsappWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappWebhookProcessor.name);

  constructor(
    private readonly webhookService: WhatsappWebhookService,
    @Inject(WHATSAPP_IDEMPOTENCY_STORE)
    private readonly idempotency: WhatsappIdempotencyStorePort,
  ) {
    super();
  }

  async process(job: Job<WhatsappWebhookJobData>): Promise<void> {
    const { payload, receivedAt } = job.data;
    this.logger.log(
      `Processing WhatsApp webhook job ${job.id} (received ${receivedAt}, ${payload.entry.length} entries)`,
    );

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && isMessagesChangeValue(change.value)) {
          await this.processMessagesChange(change.value);
          continue;
        }

        if (
          change.field === 'message_template_status_update' &&
          isTemplateStatusChangeValue(change.value)
        ) {
          await this.processTemplateStatusChange(change.value);
          continue;
        }

        this.logger.debug(`Skipping unsupported WhatsApp change field: ${change.field}`);
      }
    }
  }

  private async processMessagesChange(value: WhatsappMessagesChangeValue): Promise<void> {
    if (value.messages) {
      for (const message of value.messages) {
        await this.processInboundMessage(message, value.metadata.phone_number_id);
      }
    }

    if (value.statuses) {
      for (const status of value.statuses) {
        await this.processMessageStatus(status);
      }
    }
  }

  /**
   * Idempotency: WhatsApp assigns a globally unique `messages[].id` (wamid.*).
   * Claim `msg:{id}` in Redis BEFORE any side effects (DB writes, auto-replies, etc.).
   * Meta retries failed deliveries for up to 24h — TTL must cover that window.
   */
  private async processInboundMessage(
    message: WhatsappInboundMessage,
    phoneNumberId: string,
  ): Promise<void> {
    const idempotencyKey = `msg:${message.id}`;
    const claimed = await this.idempotency.tryClaim(
      idempotencyKey,
      WHATSAPP_IDEMPOTENCY_TTL_SECONDS,
    );
    if (!claimed) {
      this.logger.log(`Duplicate inbound WhatsApp message skipped: ${message.id}`);
      return;
    }

    await this.webhookService.handleInboundMessage(message, phoneNumberId);
  }

  /**
   * Idempotency: delivery/read receipts use `statuses[].id` (distinct from message id).
   * Claim `status:{id}` separately — a message can have multiple status transitions.
   */
  private async processMessageStatus(status: WhatsappMessageStatus): Promise<void> {
    const idempotencyKey = `status:${status.id}:${status.status}`;
    const claimed = await this.idempotency.tryClaim(
      idempotencyKey,
      WHATSAPP_IDEMPOTENCY_TTL_SECONDS,
    );
    if (!claimed) {
      this.logger.log(`Duplicate WhatsApp status update skipped: ${status.id}/${status.status}`);
      return;
    }

    await this.webhookService.handleMessageStatus(status);
  }

  /**
   * Idempotency: template events lack wamid — compose a stable key from template id + event.
   * For Postgres-backed dedup, insert into `whatsapp_webhook_events (idempotency_key)` with
   * a UNIQUE constraint and treat unique-violation as duplicate (same pattern as Razorpay).
   */
  private async processTemplateStatusChange(
    value: WhatsappTemplateStatusChangeValue,
  ): Promise<void> {
    const idempotencyKey = `template:${value.message_template_id}:${value.event}`;
    const claimed = await this.idempotency.tryClaim(
      idempotencyKey,
      WHATSAPP_IDEMPOTENCY_TTL_SECONDS,
    );
    if (!claimed) {
      this.logger.log(
        `Duplicate template status update skipped: ${value.message_template_name}/${value.event}`,
      );
      return;
    }

    await this.webhookService.handleTemplateStatusUpdate(value);
  }
}
