import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WhatsappWebhookPayload } from '@/modules/whatsapp/dto';
import {
  WHATSAPP_WEBHOOK_QUEUE,
  WhatsappWebhookJobData,
} from '@/modules/whatsapp/whatsapp.constants';

@Injectable()
export class WhatsappWebhookProducerService {
  private readonly logger = new Logger(WhatsappWebhookProducerService.name);

  constructor(
    @InjectQueue(WHATSAPP_WEBHOOK_QUEUE) private readonly queue: Queue<WhatsappWebhookJobData>,
  ) {}

  /**
   * Enqueues a validated webhook for background processing.
   * Intentionally lightweight — safe to await in the controller before returning 200.
   */
  async enqueuePayload(payload: WhatsappWebhookPayload): Promise<void> {
    await this.queue.add(
      'process-webhook',
      { receivedAt: new Date().toISOString(), payload },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );
    this.logger.debug(
      `Enqueued WhatsApp webhook with ${payload.entry.length} entr${payload.entry.length === 1 ? 'y' : 'ies'}`,
    );
  }
}
