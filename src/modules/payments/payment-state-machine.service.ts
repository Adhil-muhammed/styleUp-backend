import { Inject, Injectable } from '@nestjs/common';
import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import { assertTransition } from '@/modules/payments/domain/payment-transitions';
import { BOOKING_PAYMENT, BookingPaymentPort } from '@/modules/payments/ports/booking-payment.port';
import {
  PAYMENT_REPOSITORY,
  PaymentRecord,
  PaymentRepositoryPort,
} from '@/modules/payments/ports/payment.repository.port';

@Injectable()
export class PaymentStateMachineService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: PaymentRepositoryPort,
    @Inject(BOOKING_PAYMENT)
    private readonly bookingPayment: BookingPaymentPort,
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
