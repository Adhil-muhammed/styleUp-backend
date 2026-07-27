import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_booking_items_parent, idx_booking_items_staff_schedule, idx_booking_items_shop_service, idx_booking_items_package
@Entity('booking_items')
export class BookingItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId!: string;

  /** Exactly one of `shopServiceId` / `packageId` is set — enforced by chk_booking_items_service_xor_package. */
  @Column({ name: 'shop_service_id', type: 'uuid', nullable: true })
  shopServiceId!: string | null;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId!: string | null;

  @Column({ name: 'scheduled_start', type: 'timestamptz' })
  scheduledStart!: Date;

  @Column({ name: 'scheduled_end', type: 'timestamptz' })
  scheduledEnd!: Date;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'unit_price_paise', type: 'bigint' })
  unitPricePaise!: string;

  @Column({
    name: 'item_status',
    type: 'varchar',
    length: 32,
    default: BookingItemStatus.PENDING,
  })
  itemStatus!: BookingItemStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => StaffEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity;

  @ManyToOne(() => ShopServiceEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'shop_service_id' })
  shopService!: ShopServiceEntity | null;

  @ManyToOne(() => PackageEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'package_id' })
  package!: PackageEntity | null;
}
