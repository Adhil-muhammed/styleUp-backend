import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { CustomerGender } from '@/infra/persistence/postgres/auth/auth.enums';

@Entity('customers')
export class CustomerEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 128 })
  displayName!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'nickname', type: 'varchar', length: 64, nullable: true })
  nickname!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ name: 'gender', type: 'varchar', length: 16, nullable: true })
  gender!: CustomerGender | null;

  @Column({ name: 'country', type: 'varchar', length: 64, nullable: true })
  country!: string | null;

  @Column({ name: 'xp_points', type: 'int', default: 0 })
  xpPoints!: number;

  @Column({ name: 'membership_level', type: 'int', default: 1 })
  membershipLevel!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
