import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { TimelineEventType } from '@/infra/persistence/postgres/transactions/transactions.enums';

// Indexes (Flyway): idx_timeline_item_lookup, idx_booking_timeline_booking
@Entity('booking_timeline')
export class BookingTimelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  /** Set only for line-item level events. */
  @Column({ name: 'booking_item_id', type: 'uuid', nullable: true })
  bookingItemId!: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: TimelineEventType;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => BookingItemEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'booking_item_id' })
  bookingItem!: BookingItemEntity | null;
}
