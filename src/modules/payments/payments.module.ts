import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockPaymentGatewayAdapter } from '@/infra/razorpay/mock-payment-gateway.adapter';
import { RazorpayGatewayAdapter } from '@/infra/razorpay/razorpay-gateway.adapter';
import { TypeOrmBookingPaymentAdapter } from '@/infra/persistence/postgres/payments/typeorm-booking-payment.adapter';
import { TypeOrmPaymentRepository } from '@/infra/persistence/postgres/payments/typeorm-payment.repository';
import { TypeOrmWebhookEventRepository } from '@/infra/persistence/postgres/payments/typeorm-webhook-event.repository';
import { BookingEntity } from '@/infra/persistence/postgres/transactions/booking.entity';
import { BookingItemEntity } from '@/infra/persistence/postgres/transactions/booking-item.entity';
import { BookingTimelineEntity } from '@/infra/persistence/postgres/transactions/booking-timeline.entity';
import { PaymentEntity } from '@/infra/persistence/postgres/transactions/payment.entity';
import { PaymentWebhookEventEntity } from '@/infra/persistence/postgres/transactions/payment-webhook-event.entity';
import { MessagingModule } from '@/modules/messaging';
import { PaymentStateMachineService } from '@/modules/payments/payment-state-machine.service';
import { PaymentsWebhookController } from '@/modules/payments/payments-webhook.controller';
import { PaymentsService } from '@/modules/payments/payments.service';
import { BOOKING_PAYMENT } from '@/modules/payments/ports/booking-payment.port';
import { PAYMENT_GATEWAY } from '@/modules/payments/ports/payment-gateway.port';
import { PAYMENT_REPOSITORY } from '@/modules/payments/ports/payment.repository.port';
import { WEBHOOK_EVENT_REPOSITORY } from '@/modules/payments/ports/webhook-event.repository.port';

@Module({
  imports: [
    ConfigModule,
    MessagingModule,
    TypeOrmModule.forFeature([
      PaymentEntity,
      PaymentWebhookEventEntity,
      BookingEntity,
      BookingItemEntity,
      BookingTimelineEntity,
    ]),
  ],
  controllers: [PaymentsWebhookController],
  providers: [
    PaymentsService,
    PaymentStateMachineService,
    { provide: PAYMENT_REPOSITORY, useClass: TypeOrmPaymentRepository },
    { provide: WEBHOOK_EVENT_REPOSITORY, useClass: TypeOrmWebhookEventRepository },
    { provide: BOOKING_PAYMENT, useClass: TypeOrmBookingPaymentAdapter },
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const enabled = config.get<boolean>('razorpay.enabled');
        const keyId = config.get<string>('razorpay.keyId') ?? '';
        const keySecret = config.get<string>('razorpay.keySecret') ?? '';

        if (enabled && keyId && keySecret) {
          return new RazorpayGatewayAdapter(config);
        }
        return new MockPaymentGatewayAdapter();
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
