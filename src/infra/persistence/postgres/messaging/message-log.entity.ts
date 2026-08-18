import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Indexes (Flyway): idx_message_logs_shop_created, idx_message_logs_shop, idx_message_logs_provider_message_id
@Entity('message_logs')
export class MessageLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @Column({ type: 'varchar', length: 32 })
  recipient!: string;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @Column({ name: 'template_name', type: 'varchar', length: 128 })
  templateName!: string;

  @Column({ type: 'jsonb', default: {} })
  variables!: Record<string, string>;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 128, nullable: true })
  providerMessageId!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'msg91' })
  provider!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
}
