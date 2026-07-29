import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/auth';
import { ShopsController } from '@/modules/shops/shops.controller';
import { ShopsService } from '@/modules/shops/shops.service';
import { SHOP_PROFILE_REPOSITORY } from '@/modules/shops/ports/shop-profile.repository.port';
import { TypeOrmShopProfileRepository } from '@/infra/persistence/postgres/shops/typeorm-shop-profile.repository';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { ShopGalleryEntity } from '@/infra/persistence/postgres/merchant/shop-gallery.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ScheduleEntity } from '@/infra/persistence/postgres/scheduling/schedule.entity';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { PackageItemEntity } from '@/infra/persistence/postgres/catalog/package-item.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { ServiceCategoryEntity } from '@/infra/persistence/postgres/catalog/service-category.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ShopEntity,
      ShopGalleryEntity,
      StaffEntity,
      ScheduleEntity,
      PackageEntity,
      PackageItemEntity,
      ShopServiceEntity,
      CatalogServiceEntity,
      ServiceCategoryEntity,
      BookingItemEntity,
    ]),
  ],
  controllers: [ShopsController],
  providers: [
    ShopsService,
    { provide: SHOP_PROFILE_REPOSITORY, useClass: TypeOrmShopProfileRepository },
  ],
})
export class ShopsModule {}
