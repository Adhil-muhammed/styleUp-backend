import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import { PaymentStateMachineService } from '@/modules/payments/payment-state-machine.service';
import { BOOKING_PAYMENT, BookingPaymentPort } from '@/modules/payments/ports/booking-payment.port';
import { PAYMENT_GATEWAY, PaymentGatewayPort } from '@/modules/payments/ports/payment-gateway.port';
import {
  PAYMENT_REPOSITORY,
  PaymentRepositoryPort,
} from '@/modules/payments/ports/payment.repository.port';
import {
  WEBHOOK_EVENT_REPOSITORY,
  WebhookEventRepositoryPort,
} from '@/modules/payments/ports/webhook-event.repository.port';
import { PaymentIntentResult, PaymentStatusResult } from '@/shared/types';

const CURRENCY = 'INR';

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
        error_description?: string;
      };
    };
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGatewayPort,
    @Inject(BOOKING_PAYMENT)
    private readonly bookingPayment: BookingPaymentPort,
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEvents: WebhookEventRepositoryPort,
    private readonly stateMachine: PaymentStateMachineService,
  ) {}

  async initiateUpiPayment(bookingId: string, customerId: string): Promise<PaymentIntentResult> {
    const booking = await this.bookingPayment.findPendingForPayment(bookingId, customerId);
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      throw new ConflictException({ code: 'ALREADY_PAID', message: 'Booking already paid' });
    }

    if (booking.bookingStatus !== 'pending' || booking.paymentStatus !== 'pending') {
      if (booking.paymentStatus === 'failed') {
        // Allow retry after failed payment — fall through to create a new attempt.
      } else {
        throw new ConflictException({
          code: 'BOOKING_NOT_PAYABLE',
          message: 'Booking is not in a payable state',
        });
      }
    }

    const existing = await this.paymentRepo.findActiveByBookingId(bookingId);
    if (existing?.gatewayOrderId) {
      return this.buildIntent(existing);
    }

    const amountPaise = Number(booking.totalPricePaise);
    let payment = existing;

    if (!payment) {
      payment = await this.paymentRepo.createPending({
        bookingId,
        amountPaise: booking.totalPricePaise,
      });
    }

    const order = await this.gateway.createOrder(amountPaise, bookingId, {
      bookingId,
      customerId,
    });

    payment = await this.stateMachine.transitionToProcessing(payment, order.orderId);
    return this.buildIntent(payment);
  }

  async getPaymentStatusForBooking(
    bookingId: string,
    customerId: string,
  ): Promise<PaymentStatusResult> {
    const status = await this.bookingPayment.getPaymentStatus(bookingId, customerId);
    if (!status) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }

    const active = await this.paymentRepo.findActiveByBookingId(bookingId);
    const latest = active;

    return {
      bookingId,
      bookingStatus: status.bookingStatus,
      paymentStatus: status.paymentStatus,
      razorpayOrderId: latest?.gatewayOrderId ?? undefined,
      transactionStatus: latest?.transactionStatus,
    };
  }

  async handleWebhookEvent(
    eventId: string,
    payload: RazorpayWebhookPayload,
  ): Promise<{ duplicate: boolean }> {
    const paymentEntity = payload.payload.payment?.entity;
    const recorded = await this.webhookEvents.tryRecordEvent({
      gatewayEventId: eventId,
      eventType: payload.event,
      gatewayPaymentId: paymentEntity?.id ?? null,
      gatewayOrderId: paymentEntity?.order_id ?? null,
      payload: payload as unknown as Record<string, unknown>,
    });

    if (!recorded) {
      return { duplicate: true };
    }

    if (payload.event === 'payment.captured') {
      await this.handlePaymentCaptured(payload);
    } else if (payload.event === 'payment.failed') {
      await this.handlePaymentFailed(payload);
    }

    return { duplicate: false };
  }

  private async handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
    const entity = payload.payload.payment?.entity;
    if (!entity?.id) return;

    const payment =
      (entity.order_id ? await this.paymentRepo.findByGatewayOrderId(entity.order_id) : null) ??
      (await this.paymentRepo.findByGatewayTransactionId(entity.id));

    if (!payment) return;

    const booking = await this.bookingPayment.findByBookingId(payment.bookingId);
    if (!booking) return;

    await this.stateMachine.transitionToSuccess(
      payment,
      booking.customerId,
      entity.id,
      payload as unknown as Record<string, unknown>,
    );
  }

  private async handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
    const entity = payload.payload.payment?.entity;
    if (!entity?.order_id && !entity?.id) return;

    const payment =
      (entity.order_id ? await this.paymentRepo.findByGatewayOrderId(entity.order_id) : null) ??
      (entity.id ? await this.paymentRepo.findByGatewayTransactionId(entity.id) : null);

    if (!payment) return;

    const booking = await this.bookingPayment.findByBookingId(payment.bookingId);
    if (!booking) return;

    await this.stateMachine.transitionToFailed(
      payment,
      booking.customerId,
      payload as unknown as Record<string, unknown>,
    );
  }

  private buildIntent(payment: {
    id: string;
    gatewayOrderId: string | null;
    amountPaise: string;
    transactionStatus: TransactionStatus;
  }): PaymentIntentResult {
    return {
      paymentId: payment.id,
      razorpayOrderId: payment.gatewayOrderId ?? '',
      razorpayKeyId: this.gateway.getKeyId(),
      amountPaise: Number(payment.amountPaise),
      currency: CURRENCY,
      status: payment.transactionStatus,
    };
  }
}
