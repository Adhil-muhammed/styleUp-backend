import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ScheduleType } from '@/infra/persistence/postgres/scheduling/scheduling.enums';

// Indexes (Flyway): idx_schedules_tenant_day
@Entity('schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  /** NULL only for `shop_operating_hours` rows. */
  @Column({ name: 'staff_id', type: 'uuid', nullable: true })
  staffId!: string | null;

  @Column({ name: 'schedule_type', type: 'varchar', length: 32 })
  scheduleType!: ScheduleType;

  /** ISO day of week, 1 (Monday) through 7 (Sunday). */
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed!: boolean;

  @Column({ name: 'label', type: 'varchar', length: 64, nullable: true })
  label!: string | null;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: string | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;

  @ManyToOne(() => StaffEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity | null;
}
