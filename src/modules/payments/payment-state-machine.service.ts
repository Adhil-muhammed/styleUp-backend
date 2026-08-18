import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import { buildBookingMessageVariables } from '@/modules/bookings/domain/build-booking-message-variables';
import {
  MESSAGING_DISPATCH,
  MessagingDispatchPort,
} from '@/modules/messaging/ports/messaging-dispatch.port';
import { assertTransition } from '@/modules/payments/domain/payment-transitions';
import { BOOKING_PAYMENT, BookingPaymentPort } from '@/modules/payments/ports/booking-payment.port';
import {
  PAYMENT_REPOSITORY,
  PaymentRecord,
  PaymentRepositoryPort,
} from '@/modules/payments/ports/payment.repository.port';

@Injectable()
export class PaymentStateMachineService {
  private readonly logger = new Logger(PaymentStateMachineService.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: PaymentRepositoryPort,
    @Inject(BOOKING_PAYMENT)
    private readonly bookingPayment: BookingPaymentPort,
    @Inject(MESSAGING_DISPATCH)
    private readonly messagingDispatch: MessagingDispatchPort,
  ) {}

  async transitionToProcessing(
    payment: PaymentRecord,
    gatewayOrderId: string,
  ): Promise<PaymentRecord> {
    assertTransition(payment.transactionStatus, TransactionStatus.PROCESSING);
    return this.paymentRepo.markProcessing(payment.id, gatewayOrderId, payment.version);
  }

  async transitionToSuccess(
    payment: PaymentRecord,
    customerId: string,
    gatewayTransactionId: string,
    rawResponse: Record<string, unknown>,
  ): Promise<PaymentRecord> {
    if (payment.transactionStatus === TransactionStatus.SUCCESS) {
      return payment;
    }

    assertTransition(payment.transactionStatus, TransactionStatus.SUCCESS);

    const paidAt = new Date();
    const updated = await this.paymentRepo.markSuccess(
      payment.id,
      gatewayTransactionId,
      rawResponse,
      paidAt,
      payment.version,
    );

    await this.bookingPayment.markBookingPaid(payment.bookingId, customerId);

    try {
      const context = await this.bookingPayment.findMessagingContext(payment.bookingId);
      if (!context) {
        this.logger.warn(
          `Booking confirmation WhatsApp skipped for booking ${payment.bookingId}: no phone on file`,
        );
      } else {
        const result = await this.messagingDispatch.sendBookingConfirmation({
          shopId: context.shopId,
          bookingId: context.bookingId,
          recipient: context.recipient,
          variables: buildBookingMessageVariables(context, 'confirmation', gatewayTransactionId),
        });
        this.logger.log(
          `Booking confirmation WhatsApp queued for booking ${payment.bookingId} (log ${result.logId})`,
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown confirmation dispatch error';
      this.logger.error(
        `Booking confirmation WhatsApp failed for booking ${payment.bookingId}: ${message}`,
      );
    }

    return updated;
  }

  async transitionToFailed(
    payment: PaymentRecord,
    customerId: string,
    rawResponse: Record<string, unknown>,
  ): Promise<PaymentRecord> {
    if (payment.transactionStatus === TransactionStatus.FAILED) {
      return payment;
    }
    if (payment.transactionStatus === TransactionStatus.SUCCESS) {
      return payment;
    }

    assertTransition(payment.transactionStatus, TransactionStatus.FAILED);

    const updated = await this.paymentRepo.markFailed(payment.id, rawResponse, payment.version);
    await this.bookingPayment.markBookingPaymentFailed(payment.bookingId, customerId);
    return updated;
  }
}
