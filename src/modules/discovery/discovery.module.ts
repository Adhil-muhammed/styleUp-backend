import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryController } from '@/modules/discovery/discovery.controller';
import { DiscoveryService } from '@/modules/discovery/discovery.service';
import { DISCOVERY_REPOSITORY } from '@/modules/discovery/ports/discovery.repository.port';
import { HomeBannerEntity } from '@/infra/persistence/postgres/merchant/home-banner.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ServiceCategoryEntity } from '@/infra/persistence/postgres/catalog/service-category.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { TypeOrmDiscoveryRepository } from '@/infra/persistence/postgres/discovery/typeorm-discovery.repository';
import { AuthModule } from '@/modules/auth';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ShopEntity,
      StaffEntity,
      ServiceCategoryEntity,
      ShopServiceEntity,
      HomeBannerEntity,
    ]),
  ],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    { provide: DISCOVERY_REPOSITORY, useClass: TypeOrmDiscoveryRepository },
  ],
})
export class DiscoveryModule {}
