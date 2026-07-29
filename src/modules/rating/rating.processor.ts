import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { SHOP_RATING_QUEUE, ShopRatingJobData } from './rating.constants';

@Processor(SHOP_RATING_QUEUE)
export class RatingProcessor extends WorkerHost {
  private readonly logger = new Logger(RatingProcessor.name);

  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepo: Repository<ShopEntity>,
  ) {
    super();
  }

  async process(job: Job<ShopRatingJobData>): Promise<void> {
    const { shopId } = job.data;

    const result = await this.shopRepo.manager.query<{ avg_r: string | null; cnt: string }[]>(
      `SELECT AVG(r.rating)::numeric(3,2) AS avg_r, COUNT(r.id)::int AS cnt
         FROM reviews r
         JOIN bookings b ON b.id = r.booking_id
        WHERE b.shop_id = $1`,
      [shopId],
    );

    const row = result[0];
    const avgRating = row?.avg_r != null ? Number(row.avg_r) : 0;
    const reviewCount = row?.cnt != null ? Number(row.cnt) : 0;

    await this.shopRepo.update(
      { id: shopId },
      { avgRating: String(avgRating), reviewCount, updatedAt: new Date() },
    );

    this.logger.log(`Shop ${shopId} — avg_rating=${avgRating}, review_count=${reviewCount}`);
  }
}
