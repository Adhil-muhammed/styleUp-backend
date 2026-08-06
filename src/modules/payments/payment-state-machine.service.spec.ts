import { TransactionStatus } from '@/infra/persistence/postgres/transactions/transactions.enums';
import { assertTransition, canTransition } from '@/modules/payments/domain/payment-transitions';

describe('payment-transitions', () => {
  it('allows pending → processing', () => {
    expect(canTransition(TransactionStatus.PENDING, TransactionStatus.PROCESSING)).toBe(true);
  });

  it('allows processing → success and failed', () => {
    expect(canTransition(TransactionStatus.PROCESSING, TransactionStatus.SUCCESS)).toBe(true);
    expect(canTransition(TransactionStatus.PROCESSING, TransactionStatus.FAILED)).toBe(true);
  });

  it('rejects pending → success', () => {
    expect(canTransition(TransactionStatus.PENDING, TransactionStatus.SUCCESS)).toBe(false);
  });

  it('assertTransition throws on invalid move', () => {
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.SUCCESS)).toThrow(
      'INVALID_PAYMENT_TRANSITION',
    );
  });
});
