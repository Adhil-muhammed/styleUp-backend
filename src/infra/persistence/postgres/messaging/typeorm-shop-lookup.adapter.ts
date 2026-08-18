import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { ShopLookupPort } from '@/modules/messaging/ports/shop-lookup.port';

@Injectable()
export class TypeOrmShopLookupAdapter implements ShopLookupPort {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepo: Repository<ShopEntity>,
  ) {}

  async existsById(shopId: string): Promise<boolean> {
    const count = await this.shopRepo.count({ where: { id: shopId } });
    return count > 0;
  }
}
