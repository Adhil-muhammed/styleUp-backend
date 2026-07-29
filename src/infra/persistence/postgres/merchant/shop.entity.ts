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
import { ShopStatus } from '@/infra/persistence/postgres/merchant/merchant.enums';
import { GeoJsonPoint } from '@/shared/types/geo-json-point';

// Indexes (Flyway): idx_shops_location, idx_shops_city_status, idx_shops_owner
@Entity('shops')
export class ShopEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'name', type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'phone', type: 'varchar', length: 32 })
  phone!: string;

  @Column({ name: 'city', type: 'varchar', length: 64 })
  city!: string;

  @Column({ name: 'address', type: 'text' })
  address!: string;

  @Column({
    name: 'location',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: GeoJsonPoint;

  @Column({ name: 'status', type: 'varchar', length: 32 })
  status!: ShopStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason!: string | null;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 512, nullable: true })
  coverImageUrl!: string | null;

  @Column({ name: 'service_radius_meters', type: 'int', nullable: true })
  serviceRadiusMeters!: number | null;

  /** Denormalized average rating — updated asynchronously by RatingProcessor (BullMQ). */
  @Column({ name: 'avg_rating', type: 'numeric', precision: 3, scale: 2, default: 0 })
  avgRating!: string;

  /** Denormalized review count — updated asynchronously by RatingProcessor (BullMQ). */
  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;
}
