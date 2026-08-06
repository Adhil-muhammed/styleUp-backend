import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/auth';
import { PaymentsModule } from '@/modules/payments';
import { BookingsController } from '@/modules/bookings/bookings.controller';
import { BookingsService } from '@/modules/bookings/bookings.service';
import { AVAILABILITY_REPOSITORY } from '@/modules/bookings/ports/availability.repository.port';
import { BOOKING_REPOSITORY } from '@/modules/bookings/ports/booking.repository.port';
import { PAYMENT_METHOD_REPOSITORY } from '@/modules/bookings/ports/payment-method.repository.port';
import { TypeOrmAvailabilityRepository } from '@/infra/persistence/postgres/bookings/typeorm-availability.repository';
import { TypeOrmBookingRepository } from '@/infra/persistence/postgres/bookings/typeorm-booking.repository';
import { TypeOrmPaymentMethodRepository } from '@/infra/persistence/postgres/bookings/typeorm-payment-method.repository';
import { ScheduleEntity } from '@/infra/persistence/postgres/scheduling/schedule.entity';
import { ScheduleExceptionEntity } from '@/infra/persistence/postgres/scheduling/schedule-exception.entity';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { BookingTimelineEntity } from '@/infra/persistence/postgres/transactions/booking-timeline.entity';
import { PaymentEntity } from '@/infra/persistence/postgres/transactions/payment.entity';
import { PaymentMethodEntity } from '@/infra/persistence/postgres/transactions/payment-method.entity';
import { StaffEntity } from '@/infra/persistence/postgres/merchant/staff.entity';
import { ShopEntity } from '@/infra/persistence/postgres/merchant/shop.entity';
import { ShopServiceEntity } from '@/infra/persistence/postgres/catalog/shop-service.entity';
import { CatalogServiceEntity } from '@/infra/persistence/postgres/catalog/catalog-service.entity';
import { PackageEntity } from '@/infra/persistence/postgres/catalog/package.entity';
import { PackageItemEntity } from '@/infra/persistence/postgres/catalog/package-item.entity';
import { CustomerEntity } from '@/infra/persistence/postgres/auth/customer.entity';
import { UserEntity } from '@/infra/persistence/postgres/auth/user.entity';

@Module({
  imports: [
    AuthModule,
    PaymentsModule,
    TypeOrmModule.forFeature([
      ScheduleEntity,
      ScheduleExceptionEntity,
      BookingEntity,
      BookingItemEntity,
      BookingTimelineEntity,
      PaymentEntity,
      PaymentMethodEntity,
      StaffEntity,
      ShopEntity,
      ShopServiceEntity,
      CatalogServiceEntity,
      PackageEntity,
      PackageItemEntity,
      CustomerEntity,
      UserEntity,
    ]),
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    { provide: AVAILABILITY_REPOSITORY, useClass: TypeOrmAvailabilityRepository },
    { provide: BOOKING_REPOSITORY, useClass: TypeOrmBookingRepository },
    { provide: PAYMENT_METHOD_REPOSITORY, useClass: TypeOrmPaymentMethodRepository },
  ],
})
export class BookingsModule {}
