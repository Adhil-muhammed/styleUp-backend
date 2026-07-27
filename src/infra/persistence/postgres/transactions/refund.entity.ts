import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { PaymentEntity } from '@/infra/persistence/postgres/transactions/payment.entity';
import { RefundStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_refunds_payment, idx_refunds_booking_item
/** No `updated_at`: the document rejected it in favour of requested_at / completed_at. */
@Entity('refunds')
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  /** Ties a partial refund to the cancellation of one service in a multi-service order. */
  @Column({ name: 'booking_item_id', type: 'uuid', nullable: true })
  bookingItemId!: string | null;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'amount_paise', type: 'bigint' })
  amountPaise!: string;

  @Column({ name: 'reason', type: 'varchar', length: 64 })
  reason!: string;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: RefundStatus;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => PaymentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment!: PaymentEntity;

  @ManyToOne(() => BookingItemEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'booking_item_id' })
  bookingItem!: BookingItemEntity | null;
}
