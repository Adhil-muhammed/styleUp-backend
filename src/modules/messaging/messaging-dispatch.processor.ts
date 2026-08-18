import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  MESSAGING_DISPATCH_QUEUE,
  MessagingDispatchJobData,
} from '@/modules/messaging/messaging.constants';
import {
  MESSAGE_LOG_REPOSITORY,
  MessageLogRepositoryPort,
} from '@/modules/messaging/ports/message-log.repository.port';
import { MESSAGE_SENDER, MessageSenderPort } from '@/modules/messaging/ports/message-sender.port';

@Processor(MESSAGING_DISPATCH_QUEUE)
export class MessagingDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagingDispatchProcessor.name);

  constructor(
    @Inject(MESSAGE_LOG_REPOSITORY) private readonly messageLogs: MessageLogRepositoryPort,
    @Inject(MESSAGE_SENDER) private readonly sender: MessageSenderPort,
  ) {
    super();
  }

  async process(job: Job<MessagingDispatchJobData>): Promise<void> {
    const { logId } = job.data;
    const log = await this.messageLogs.findById(logId);
    if (!log) {
      throw new Error(`Message log not found: ${logId}`);
    }

    if (log.status === 'sent' || log.status === 'delivered' || log.status === 'read') {
      this.logger.log(`Message log ${logId} already sent — skipping duplicate job`);
      return;
    }

    try {
      const result = await this.sender.sendTemplate({
        channel: job.data.channel,
        recipient: job.data.recipient,
        templateName: job.data.templateName,
        variables: job.data.variables,
      });
      await this.messageLogs.markSent(logId, result.providerMessageId, new Date());
      this.logger.log(`Message log ${logId} sent via ${job.data.channel}`);
    } catch (error: unknown) {
      const failureReason = error instanceof Error ? error.message : 'Unknown send failure';
      await this.messageLogs.markFailed(logId, failureReason);
      this.logger.error(`Message log ${logId} failed: ${failureReason}`);
      throw error;
    }
  }
}
