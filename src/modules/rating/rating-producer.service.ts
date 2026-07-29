import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SHOP_RATING_QUEUE, ShopRatingJobData } from './rating.constants';

@Injectable()
export class RatingProducerService {
  private readonly logger = new Logger(RatingProducerService.name);

  constructor(@InjectQueue(SHOP_RATING_QUEUE) private readonly queue: Queue<ShopRatingJobData>) {}

  /**
   * Enqueues a shop rating recompute job.
   *
   * Uses `jobId = shopId` so that multiple review writes for the same shop
   * within the debounce window collapse into a single job (BullMQ deduplication
   * by jobId when the job is already waiting/delayed).
   */
  async enqueueShopRatingRecompute(shopId: string): Promise<void> {
    await this.queue.add(
      'recompute',
      { shopId },
      {
        jobId: shopId,
        removeOnComplete: true,
        removeOnFail: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.debug(`Enqueued rating recompute for shop ${shopId}`);
  }
}
