import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import {
  ExceptionScope,
  ExceptionType,
  ExceptionWorkflowStatus,
} from '@/infra/persistence/postgres/scheduling/scheduling.enums';

// Indexes (Flyway): idx_exceptions_tenant_time
@Entity('schedule_exceptions')
export class ScheduleExceptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  /** NULL only for `shop` scope rows. */
  @Column({ name: 'staff_id', type: 'uuid', nullable: true })
  staffId!: string | null;

  @Column({ name: 'scope', type: 'varchar', length: 16 })
  scope!: ExceptionScope;

  @Column({ name: 'exception_type', type: 'varchar', length: 32 })
  exceptionType!: ExceptionType;

  @Column({ name: 'start_timestamp', type: 'timestamptz' })
  startTimestamp!: Date;

  @Column({ name: 'end_timestamp', type: 'timestamptz' })
  endTimestamp!: Date;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({
    name: 'workflow_status',
    type: 'varchar',
    length: 32,
    default: ExceptionWorkflowStatus.APPROVED,
  })
  workflowStatus!: ExceptionWorkflowStatus;

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @ManyToOne(() => StaffEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity | null;
}
