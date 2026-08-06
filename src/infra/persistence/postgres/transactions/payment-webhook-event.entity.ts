import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Indexes (Flyway): uq_payment_webhook_events_gateway_event_id, idx_payment_webhook_events_order
@Entity('payment_webhook_events')
export class PaymentWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'gateway_event_id', type: 'varchar', length: 128 })
  gatewayEventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'gateway_payment_id', type: 'varchar', length: 128, nullable: true })
  gatewayPaymentId!: string | null;

  @Column({ name: 'gateway_order_id', type: 'varchar', length: 128, nullable: true })
  gatewayOrderId!: string | null;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;
}
