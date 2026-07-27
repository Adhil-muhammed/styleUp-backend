import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import {
  BookingPaymentStatus,
  BookingStatus,
} from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_bookings_dashboard, idx_bookings_customer_view
@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'booking_status', type: 'varchar', length: 32 })
  bookingStatus!: BookingStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 32 })
  paymentStatus!: BookingPaymentStatus;

  @Column({ name: 'scheduled_start', type: 'timestamptz' })
  scheduledStart!: Date;

  @Column({ name: 'scheduled_end', type: 'timestamptz' })
  scheduledEnd!: Date;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'total_price_paise', type: 'bigint' })
  totalPricePaise!: string;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes!: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /** Optimistic locking — required on concurrent-write rows per postgres-schema.mdc §B. */
  @VersionColumn({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @ManyToOne(() => ShopEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @ManyToOne(() => CustomerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'userId' })
  customer!: CustomerEntity;
}
