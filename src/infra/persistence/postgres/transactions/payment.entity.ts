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
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import {
  PaymentMethod,
  TransactionStatus,
} from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_payments_gateway_tx, idx_payments_booking
@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'gateway', type: 'varchar', length: 32 })
  gateway!: string;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 128, nullable: true })
  gatewayTransactionId!: string | null;

  @Column({ name: 'gateway_order_id', type: 'varchar', length: 128, nullable: true })
  gatewayOrderId!: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 32 })
  paymentMethod!: PaymentMethod;

  /** bigint is returned as a string by the postgres driver. */
  @Column({ name: 'amount_paise', type: 'bigint' })
  amountPaise!: string;

  @Column({ name: 'refunded_amount_paise', type: 'bigint', default: 0 })
  refundedAmountPaise!: string;

  @Column({ name: 'transaction_status', type: 'varchar', length: 32 })
  transactionStatus!: TransactionStatus;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse!: Record<string, unknown> | null;

  /** Set to now() when transaction_status transitions to 'success'. Null before confirmation. */
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /** Optimistic locking — required on concurrent-write rows per postgres-schema.mdc §B. */
  @VersionColumn({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @ManyToOne(() => BookingEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;
}
