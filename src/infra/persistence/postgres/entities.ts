import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { PermissionEntity } from '@/infra/persistence/postgres/auth/permission.entity';
import { RoleEntity } from '@/infra/persistence/postgres/auth/role.entity';
import { RolePermissionEntity } from '@/infra/persistence/postgres/auth/role-permission.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';
import { UserIdentityEntity } from '@/infra/persistence/postgres/auth/user-identity.entity';
import { UserRoleEntity } from '@/infra/persistence/postgres/auth/user-role.entity';
import { UserSessionEntity } from '@/infra/persistence/postgres/auth/user-session.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { HomeBannerEntity } from '@/infra/persistence/postgres/merchant/home-banner.entity';
import { ShopGalleryEntity } from '@/infra/persistence/postgres/merchant/shop-gallery.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { PackageItemEntity } from '@/infra/persistence/postgres/catalog/package-item.entity';
import { ServiceCategoryEntity } from '@/infra/persistence/postgres/catalog/service-category.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { ScheduleEntity } from '@/infra/persistence/postgres/scheduling/schedule.entity';
import { ScheduleExceptionEntity } from '@/infra/persistence/postgres/scheduling/schedule-exception.entity';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { BookingTimelineEntity } from '@/infra/persistence/postgres/transactions/booking-timeline.entity';
import { PaymentEntity } from '@/infra/persistence/postgres/transactions/payment.entity';
import { PaymentMethodEntity } from '@/infra/persistence/postgres/transactions/payment-method.entity';
import { PaymentWebhookEventEntity } from '@/infra/persistence/postgres/transactions/payment-webhook-event.entity';
import { RefundEntity } from '@/infra/persistence/postgres/transactions/refund.entity';
import { ReviewEntity } from '@/infra/persistence/postgres/transactions/review.entity';
import { SettlementEntity } from '@/infra/persistence/postgres/transactions/settlement.entity';

export const POSTGRES_ENTITIES = [
  UserEntity,
  UserIdentityEntity,
  UserSessionEntity,
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
  CustomerEntity,
  ShopEntity,
  HomeBannerEntity,
  ShopGalleryEntity,
  StaffEntity,
  ServiceCategoryEntity,
  CatalogServiceEntity,
  ShopServiceEntity,
  PackageEntity,
  PackageItemEntity,
  ScheduleEntity,
  ScheduleExceptionEntity,
  BookingEntity,
  BookingItemEntity,
  BookingTimelineEntity,
  PaymentEntity,
  PaymentMethodEntity,
  PaymentWebhookEventEntity,
  RefundEntity,
  SettlementEntity,
  ReviewEntity,
];
