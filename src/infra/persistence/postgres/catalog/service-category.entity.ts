import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceCategoryStatus } from '@/infra/persistence/postgres/catalog/catalog.enums';

// Indexes (Flyway): idx_categories_slug
@Entity('service_categories')
export class ServiceCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'slug', type: 'varchar', length: 64 })
  slug!: string;

  @Column({ name: 'name', type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 512, nullable: true })
  iconUrl!: string | null;

  @Column({ name: 'banner_url', type: 'varchar', length: 512, nullable: true })
  bannerUrl!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: ServiceCategoryStatus.ACTIVE,
  })
  status!: ServiceCategoryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
