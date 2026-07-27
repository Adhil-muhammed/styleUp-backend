import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleEntity } from '@/infra/persistence/postgres/auth/role.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';

// Indexes (Flyway): idx_user_role_scope, idx_user_roles_role
@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  /** NULL implies global/platform scope rather than a single shop. */
  @Column({ name: 'shop_id', type: 'uuid', nullable: true })
  shopId!: string | null;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'shop_id' })
  shop!: ShopEntity | null;
}
