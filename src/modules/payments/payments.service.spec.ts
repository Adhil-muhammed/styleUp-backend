import { ConflictException, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import { PaymentStateMachineService } from '@/modules/payments/payment-state-machine.service';
import { PaymentsService } from '@/modules/payments/payments.service';
import { MessagingDispatchPort } from '@/modules/messaging/ports/messaging-dispatch.port';
import { BookingPaymentPort } from '@/modules/payments/ports/booking-payment.port';
import { PaymentGatewayPort } from '@/modules/payments/ports/payment-gateway.port';
import {
  PaymentRecord,
  PaymentRepositoryPort,
} from '@/modules/payments/ports/payment.repository.port';
import { WebhookEventRepositoryPort } from '@/modules/payments/ports/webhook-event.repository.port';

const BOOKING_ID = 'booking-uuid';
const CUSTOMER_ID = 'customer-uuid';
const PAYMENT_ID = 'payment-uuid';

const mockPayment: PaymentRecord = {
  id: PAYMENT_ID,
  bookingId: BOOKING_ID,
  gateway: 'razorpay',
  gatewayOrderId: null,
  gatewayTransactionId: null,
  amountPaise: '30000',
  transactionStatus: TransactionStatus.PENDING,
  version: 1,
};

function makeMocks() {
  const paymentRepo: jest.Mocked<PaymentRepositoryPort> = {
    createPending: jest.fn(),
    findActiveByBookingId: jest.fn(),
    findByGatewayOrderId: jest.fn(),
    findByGatewayTransactionId: jest.fn(),
    markProcessing: jest.fn(),
    markSuccess: jest.fn(),
    markFailed: jest.fn(),
  };

  const gateway: jest.Mocked<PaymentGatewayPort> = {
    createOrder: jest.fn(),
    getKeyId: jest.fn().mockReturnValue('rzp_test_key'),
  };

  const bookingPayment: jest.Mocked<BookingPaymentPort> = {
    findPendingForPayment: jest.fn(),
    findByBookingId: jest.fn(),
    markBookingPaid: jest.fn(),
    markBookingPaymentFailed: jest.fn(),
    getPaymentStatus: jest.fn(),
    findMessagingContext: jest.fn(),
  };

  const webhookEvents: jest.Mocked<WebhookEventRepositoryPort> = {
    tryRecordEvent: jest.fn(),
  };

  const messagingDispatch: Pick<
    MessagingDispatchPort,
    'sendBookingConfirmation' | 'sendBookingReminder' | 'sendBookingCancellation'
  > = {
    sendBookingConfirmation: jest.fn().mockResolvedValue({ logId: 'log-1' }),
    sendBookingReminder: jest.fn(),
    sendBookingCancellation: jest.fn(),
  };

  const stateMachine = new PaymentStateMachineService(
    paymentRepo,
    bookingPayment,
    messagingDispatch as MessagingDispatchPort,
  );

  const service = new PaymentsService(
    paymentRepo,
    gateway,
    bookingPayment,
    webhookEvents,
    stateMachine,
  );

  return { service, paymentRepo, gateway, bookingPayment, webhookEvents, stateMachine };
}

describe('PaymentsService', () => {
  describe('initiateUpiPayment', () => {
    it('throws BOOKING_NOT_FOUND when booking missing', async () => {
      const { service, bookingPayment } = makeMocks();
      bookingPayment.findPendingForPayment.mockResolvedValue(null);

      await expect(service.initiateUpiPayment(BOOKING_ID, CUSTOMER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ALREADY_PAID when booking paid', async () => {
      const { service, bookingPayment } = makeMocks();
      bookingPayment.findPendingForPayment.mockResolvedValue({
        bookingId: BOOKING_ID,
        customerId: CUSTOMER_ID,
        totalPricePaise: '30000',
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
      });

      await expect(service.initiateUpiPayment(BOOKING_ID, CUSTOMER_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('creates order and returns intent payload', async () => {
      const { service, paymentRepo, gateway, bookingPayment } = makeMocks();

      bookingPayment.findPendingForPayment.mockResolvedValue({
        bookingId: BOOKING_ID,
        customerId: CUSTOMER_ID,
        totalPricePaise: '30000',
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      });
      paymentRepo.findActiveByBookingId.mockResolvedValue(null);
      paymentRepo.createPending.mockResolvedValue(mockPayment);
      gateway.createOrder.mockResolvedValue({
        orderId: 'order_mock_1',
        amountPaise: 30000,
        currency: 'INR',
      });
      paymentRepo.markProcessing.mockResolvedValue({
        ...mockPayment,
        gatewayOrderId: 'order_mock_1',
        transactionStatus: TransactionStatus.PROCESSING,
        version: 2,
      });

      const result = await service.initiateUpiPayment(BOOKING_ID, CUSTOMER_ID);

      expect(result.razorpayOrderId).toBe('order_mock_1');
      expect(result.razorpayKeyId).toBe('rzp_test_key');
      expect(result.amountPaise).toBe(30000);
      expect(result.status).toBe(TransactionStatus.PROCESSING);
    });

    it('returns existing intent when active payment has order id', async () => {
      const { service, paymentRepo, bookingPayment } = makeMocks();

      bookingPayment.findPendingForPayment.mockResolvedValue({
        bookingId: BOOKING_ID,
        customerId: CUSTOMER_ID,
        totalPricePaise: '30000',
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      });
      paymentRepo.findActiveByBookingId.mockResolvedValue({
        ...mockPayment,
        gatewayOrderId: 'order_existing',
        transactionStatus: TransactionStatus.PROCESSING,
      });

      const result = await service.initiateUpiPayment(BOOKING_ID, CUSTOMER_ID);

      expect(result.razorpayOrderId).toBe('order_existing');
      expect(paymentRepo.createPending).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    it('skips duplicate events', async () => {
      const { service, webhookEvents } = makeMocks();
      webhookEvents.tryRecordEvent.mockResolvedValue(false);

      const result = await service.handleWebhookEvent('evt_dup', {
        event: 'payment.captured',
        payload: {},
      });

      expect(result.duplicate).toBe(true);
    });

    it('marks payment and booking success on payment.captured', async () => {
      const { service, paymentRepo, bookingPayment, webhookEvents } = makeMocks();

      webhookEvents.tryRecordEvent.mockResolvedValue(true);
      paymentRepo.findByGatewayOrderId.mockResolvedValue({
        ...mockPayment,
        gatewayOrderId: 'order_1',
        transactionStatus: TransactionStatus.PROCESSING,
      });
      bookingPayment.findByBookingId.mockResolvedValue({
        bookingId: BOOKING_ID,
        customerId: CUSTOMER_ID,
        totalPricePaise: '30000',
        bookingStatus: 'pending',
        paymentStatus: 'pending',
      });
      paymentRepo.markSuccess.mockResolvedValue({
        ...mockPayment,
        transactionStatus: TransactionStatus.SUCCESS,
      });

      await service.handleWebhookEvent('evt_1', {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
      });

      expect(paymentRepo.markSuccess).toHaveBeenCalled();
      expect(bookingPayment.markBookingPaid).toHaveBeenCalledWith(BOOKING_ID, CUSTOMER_ID);
    });
  });
});
