import { PaymentMethodItem, PaymentMethodsResult } from '@/shared/types';

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');

export interface PaymentMethodRepositoryPort {
  /** Lists all payment methods for the user, including the default method id. */
  listForUser(userId: string): Promise<PaymentMethodsResult>;

  /** Returns null when the method does not exist. */
  findById(id: string): Promise<PaymentMethodItem | null>;

  /** Returns null when the method does not exist or does not belong to the user. */
  findByIdForUser(id: string, userId: string): Promise<PaymentMethodItem | null>;
}
