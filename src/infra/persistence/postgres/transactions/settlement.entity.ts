import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { SettlementStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_settlements_lookup
@Entity('settlements')
export class SettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'gross_revenue_paise', type: 'bigint' })
  grossRevenuePaise!: string;

  @Column({ name: 'platform_commission_paise', type: 'bigint' })
  platformCommissionPaise!: string;

  @Column({ name: 'net_payable_paise', type: 'bigint' })
  netPayablePaise!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: SettlementStatus;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @ManyToOne(() => ShopEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;
}
