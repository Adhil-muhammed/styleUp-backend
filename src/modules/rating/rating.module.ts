import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { SHOP_RATING_QUEUE } from './rating.constants';
import { RatingProducerService } from './rating-producer.service';
import { RatingProcessor } from './rating.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: SHOP_RATING_QUEUE }),
    TypeOrmModule.forFeature([ShopEntity]),
  ],
  providers: [RatingProducerService, RatingProcessor],
  exports: [RatingProducerService],
})
export class RatingModule {}
