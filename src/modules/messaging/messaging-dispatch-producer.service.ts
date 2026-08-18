import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MESSAGING_DISPATCH_QUEUE,
  MessagingDispatchJobData,
} from '@/modules/messaging/messaging.constants';

@Injectable()
export class MessagingDispatchProducerService {
  private readonly logger = new Logger(MessagingDispatchProducerService.name);

  constructor(
    @InjectQueue(MESSAGING_DISPATCH_QUEUE)
    private readonly queue: Queue<MessagingDispatchJobData>,
  ) {}

  async enqueue(data: MessagingDispatchJobData): Promise<void> {
    await this.queue.add('send-template', data, {
      jobId: data.logId,
      removeOnComplete: true,
      removeOnFail: 5,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.debug(`Enqueued messaging dispatch for log ${data.logId}`);
  }
}
