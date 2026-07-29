import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Indexes (Flyway V11): idx_home_banners_active
@Entity('home_banners')
export class HomeBannerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'discount_label', type: 'varchar', length: 128 })
  discountLabel!: string;

  @Column({ name: 'subtitle', type: 'varchar', length: 256 })
  subtitle!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 512 })
  imageUrl!: string;

  @Column({ name: 'cta_label', type: 'varchar', length: 64 })
  ctaLabel!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_until', type: 'timestamptz' })
  validUntil!: Date;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
