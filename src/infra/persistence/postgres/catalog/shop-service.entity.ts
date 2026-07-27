import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';

// Indexes (Flyway): idx_shop_services_unique, idx_shop_services_lookup, idx_shop_services_search
@Entity('shop_services')
export class ShopServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @Column({ name: 'catalog_service_id', type: 'uuid' })
  catalogServiceId!: string;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'price_paise', type: 'bigint' })
  pricePaise!: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @ManyToOne(() => CatalogServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'catalog_service_id' })
  catalogService!: CatalogServiceEntity;
}
