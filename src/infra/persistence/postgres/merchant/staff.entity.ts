import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import {
  StaffAvailabilityStatus,
  StaffWorkflowStatus,
} from '@/infra/persistence/postgres/merchant/merchant.enums';

// Indexes (Flyway): idx_staff_shop, idx_staff_user
@Entity('staff')
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'shop_id', type: 'uuid' })
  shopId!: string;

  @Column({ name: 'name', type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'job_title', type: 'varchar', length: 64 })
  jobTitle!: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio!: string | null;

  @Column({
    name: 'availability_status',
    type: 'varchar',
    length: 32,
    default: StaffAvailabilityStatus.OFF,
  })
  availabilityStatus!: StaffAvailabilityStatus;

  @Column({
    name: 'workflow_status',
    type: 'varchar',
    length: 32,
    default: StaffWorkflowStatus.ACTIVE,
  })
  workflowStatus!: StaffWorkflowStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity;
}
