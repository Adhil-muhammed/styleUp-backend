import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';

@Entity('package_items')
export class PackageItemEntity {
  @PrimaryColumn({ name: 'package_id', type: 'uuid' })
  packageId!: string;

  @PrimaryColumn({ name: 'shop_service_id', type: 'uuid' })
  shopServiceId!: string;

  @ManyToOne(() => PackageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package!: PackageEntity;

  @ManyToOne(() => ShopServiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_service_id' })
  shopService!: ShopServiceEntity;
}
