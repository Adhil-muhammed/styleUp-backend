import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';

export type PaymentMethodKind = 'paypal' | 'google_pay' | 'apple_pay' | 'saved_card';

// Indexes (Flyway): idx_payment_methods_user, idx_payment_methods_default
@Entity('payment_methods')
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'kind', type: 'varchar', length: 32 })
  kind!: PaymentMethodKind;

  @Column({ name: 'label', type: 'varchar', length: 128 })
  label!: string;

  /** Present only for saved_card kind. */
  @Column({ name: 'last_four', type: 'varchar', length: 4, nullable: true })
  lastFour!: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
