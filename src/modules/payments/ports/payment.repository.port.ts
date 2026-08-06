import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentRecord {
  id: string;
  bookingId: string;
  gateway: string;
  gatewayOrderId: string | null;
  gatewayTransactionId: string | null;
  amountPaise: string;
  transactionStatus: TransactionStatus;
  version: number;
}

export interface CreatePendingPaymentInput {
  bookingId: string;
  amountPaise: string;
}

export interface PaymentRepositoryPort {
  createPending(input: CreatePendingPaymentInput): Promise<PaymentRecord>;

  findActiveByBookingId(bookingId: string): Promise<PaymentRecord | null>;

  findByGatewayOrderId(orderId: string): Promise<PaymentRecord | null>;

  findByGatewayTransactionId(transactionId: string): Promise<PaymentRecord | null>;

  markProcessing(id: string, gatewayOrderId: string, version: number): Promise<PaymentRecord>;

  markSuccess(
    id: string,
    gatewayTransactionId: string,
    rawResponse: Record<string, unknown>,
    paidAt: Date,
    version: number,
  ): Promise<PaymentRecord>;

  markFailed(
    id: string,
    rawResponse: Record<string, unknown>,
    version: number,
  ): Promise<PaymentRecord>;
}
